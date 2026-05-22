import type { HeatmapData } from '../types/farm';

export interface HeatmapCacheEntry {
  farmId: string;
  data: HeatmapData;
  cachedAt: string;
}

// Heatmap entries hold many large base64 PNG masks (NDVI/NDWI/NDRE + ranges),
// often 1-3 MB each. localStorage's ~5 MB cap overflows after a couple of
// farms, so the payloads live in IndexedDB (hundreds of MB available) instead.
const DB_NAME = 'croplab';
const DB_VERSION = 1;
const STORE = 'heatmaps';

// A tiny synchronous mirror of which farmIds have a cached heatmap. Kept in
// localStorage (just an array of ids) so the synchronous getCachedFarmIds()
// callers (dashboard badges, FarmDetail initial state) don't need to await IDB.
const INDEX_KEY = 'agriculture_heatmap_index';

// Pre-IndexedDB cache key. Migrated into IndexedDB once, then removed.
const LEGACY_CACHE_KEY = 'agriculture_heatmap_cache';

// --- Synchronous localStorage index helpers ---

function readIndex(): Set<string> {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch (error) {
    console.error('Error reading heatmap index:', error);
    return new Set();
  }
}

function writeIndex(ids: Set<string>): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...ids]));
  } catch (error) {
    console.error('Error writing heatmap index:', error);
  }
}

function addToIndex(farmId: string): void {
  const ids = readIndex();
  if (!ids.has(farmId)) {
    ids.add(farmId);
    writeIndex(ids);
  }
}

function removeFromIndex(farmId: string): void {
  const ids = readIndex();
  if (ids.delete(farmId)) {
    writeIndex(ids);
  }
}

// Bootstrap the sync index from any legacy cache at import time, so the first
// synchronous getCachedFarmIds() on initial paint sees existing farms before
// the async IndexedDB migration has run.
(function bootstrapIndex() {
  try {
    if (localStorage.getItem(INDEX_KEY)) return;
    const raw = localStorage.getItem(LEGACY_CACHE_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as HeatmapCacheEntry[];
    writeIndex(new Set(legacy.map(e => e.farmId).filter(Boolean)));
  } catch {
    /* ignore — index simply starts empty */
  }
})();

// --- IndexedDB plumbing ---

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'farmId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  // Caller must use the returned store synchronously (no awaits in between),
  // or the auto-committing transaction will close.
  return db.transaction(STORE, mode).objectStore(STORE);
}

// One-time migration of the legacy localStorage cache into IndexedDB.
let migrationPromise: Promise<void> | null = null;

function migrateLegacy(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    let legacy: HeatmapCacheEntry[] = [];
    try {
      const raw = localStorage.getItem(LEGACY_CACHE_KEY);
      legacy = raw ? (JSON.parse(raw) as HeatmapCacheEntry[]) : [];
    } catch {
      legacy = [];
    }
    if (!legacy.length) return;
    try {
      const store = await getStore('readwrite');
      const tx = store.transaction;
      for (const entry of legacy) {
        if (entry?.farmId) store.put(entry);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      writeIndex(new Set([...readIndex(), ...legacy.map(e => e.farmId).filter(Boolean)]));
      localStorage.removeItem(LEGACY_CACHE_KEY);
      console.log(`📦 Migrated ${legacy.length} heatmap(s) from localStorage to IndexedDB`);
    } catch (error) {
      console.error('Heatmap cache migration failed:', error);
    }
  })();
  return migrationPromise;
}

export const heatmapService = {
  async getByFarmId(farmId: string): Promise<HeatmapCacheEntry | null> {
    await migrateLegacy();
    try {
      const store = await getStore('readonly');
      const result = await reqToPromise(store.get(farmId));
      return (result as HeatmapCacheEntry) ?? null;
    } catch (error) {
      console.error('Error reading heatmap from IndexedDB:', error);
      return null;
    }
  },

  async save(farmId: string, data: HeatmapCacheEntry['data']): Promise<HeatmapCacheEntry> {
    const newEntry: HeatmapCacheEntry = {
      farmId,
      data,
      cachedAt: new Date().toISOString(),
    };
    const store = await getStore('readwrite');
    await reqToPromise(store.put(newEntry));
    addToIndex(farmId);
    return newEntry;
  },

  async getAllCache(): Promise<HeatmapCacheEntry[]> {
    await migrateLegacy();
    try {
      const store = await getStore('readonly');
      return ((await reqToPromise(store.getAll())) as HeatmapCacheEntry[]) ?? [];
    } catch (error) {
      console.error('Error reading heatmap cache from IndexedDB:', error);
      return [];
    }
  },

  /**
   * Set of farm ids that have a cached heatmap. Reads the lightweight
   * localStorage index synchronously — the heavy payloads stay in IndexedDB.
   */
  getCachedFarmIds(): Set<string> {
    return readIndex();
  },

  async clearByFarmId(farmId: string): Promise<boolean> {
    try {
      const store = await getStore('readwrite');
      await reqToPromise(store.delete(farmId));
    } catch (error) {
      console.error('Error clearing heatmap from IndexedDB:', error);
    }
    removeFromIndex(farmId);
    return true;
  },
};
