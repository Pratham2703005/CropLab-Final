/**
 * showcaseFarms — permanent, read-only farms baked into the build.
 *
 * The data comes from src/assets/showcase-farms.json, which is produced by
 * scripts/export-showcase-farms.js (a browser-console snapshot of guest farms
 * + their cached heatmap output). These farms always appear on the dashboard
 * and serve their stored satellite output without any backend call.
 */
import showcaseData from '../assets/showcase-farms.json';
import type { Farm, HeatmapData } from '../types/farm';

interface ShowcaseHeatmapEntry {
  farmId: string;
  data: HeatmapData;
  cachedAt: string;
}

interface ShowcaseFile {
  exportedAt: string | null;
  farmCount?: number;
  heatmapCount?: number;
  farms: Array<Record<string, unknown>>;
  heatmaps: ShowcaseHeatmapEntry[];
}

const file = showcaseData as unknown as ShowcaseFile;

const toFarm = (raw: Record<string, unknown>): Farm => ({
  id: String(raw.id ?? ''),
  name: String(raw.name ?? 'Untitled Farm'),
  crop: String(raw.crop ?? ''),
  plantingDate: String(raw.plantingDate ?? ''),
  harvestDate: String(raw.harvestDate ?? ''),
  description: typeof raw.description === 'string' ? raw.description : '',
  coordinates: Array.isArray(raw.coordinates)
    ? (raw.coordinates as number[][])
    : [],
  area: typeof raw.area === 'number' ? raw.area : 0,
  createdAt: String(raw.createdAt ?? new Date().toISOString()),
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  userId: 'showcase',
  isShowcase: true,
});

/** Farms baked into the build — always shown on the dashboard, read-only. */
export const SHOWCASE_FARMS: Farm[] = Array.isArray(file.farms)
  ? file.farms
      .filter(f => f && typeof (f as { id?: unknown }).id === 'string')
      .map(toFarm)
  : [];

const SHOWCASE_IDS = new Set(SHOWCASE_FARMS.map(f => f.id));

/** True when the id belongs to a baked-in showcase farm. */
export const isShowcaseFarmId = (id: string | undefined): boolean =>
  !!id && SHOWCASE_IDS.has(id);

/** Frozen heatmap output for a showcase farm, or null if not a showcase farm. */
export const getShowcaseHeatmap = (
  farmId: string | undefined
): HeatmapData | null => {
  if (!farmId || !Array.isArray(file.heatmaps)) return null;
  const entry = file.heatmaps.find(h => h && h.farmId === farmId);
  return entry ? entry.data : null;
};
