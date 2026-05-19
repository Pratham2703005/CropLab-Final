import type { FarmFormData } from "@/types/farm";

export const MASKS_VIEW_MODES = {
  RANGE: 'range',
  MASKS: 'masks',
} as const;

export const DEFAULT_RANGE_OPACITY = 0.7;

export const MAP_MASK_MODES = {
    NDVI: 'ndvi',
    NDWI: 'ndwi',
    NDRE: 'ndre',
    ANOMALY: 'anomaly'
} as const;

export const DEFAULT_FARM_DETAIL_KEYS = {
  PLANTING_DATE: 'plantingDate',
  HARVEST_DATE: 'harvestDate',
  SELECTED_CROP: 'crop',
  FARM_NAME: 'name'
} as const satisfies Record<string, keyof FarmFormData>;
