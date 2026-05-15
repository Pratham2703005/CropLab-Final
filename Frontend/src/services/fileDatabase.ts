import type { HeatmapData } from '../types/farm';

export interface HeatmapCacheEntry {
  farmId: string;
  data: HeatmapData;
  cachedAt: string;
}

const HEATMAP_CACHE_KEY = 'agriculture_heatmap_cache';

function readFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function writeToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw error;
  }
}

export const heatmapService = {
  async getByFarmId(farmId: string): Promise<HeatmapCacheEntry | null> {
    const cache = readFromStorage<HeatmapCacheEntry>(HEATMAP_CACHE_KEY);
    return cache.find(c => c.farmId === farmId) || null;
  },

  async save(farmId: string, data: HeatmapCacheEntry['data']): Promise<HeatmapCacheEntry> {
    const cache = readFromStorage<HeatmapCacheEntry>(HEATMAP_CACHE_KEY);
    const filteredCache = cache.filter(c => c.farmId !== farmId);

    const newEntry: HeatmapCacheEntry = {
      farmId,
      data,
      cachedAt: new Date().toISOString(),
    };

    filteredCache.push(newEntry);
    writeToStorage(HEATMAP_CACHE_KEY, filteredCache);
    return newEntry;
  },

  async getAllCache(): Promise<HeatmapCacheEntry[]> {
    return readFromStorage<HeatmapCacheEntry>(HEATMAP_CACHE_KEY);
  },

  async clearByFarmId(farmId: string): Promise<boolean> {
    const cache = readFromStorage<HeatmapCacheEntry>(HEATMAP_CACHE_KEY);
    const filteredCache = cache.filter(c => c.farmId !== farmId);
    writeToStorage(HEATMAP_CACHE_KEY, filteredCache);
    return true;
  },
};
