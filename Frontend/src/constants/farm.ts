export const DEFAULT_MASK_OPACITY = {
  red: 0.7,
  yellow: 0.7,
  green: 0.7,
  brown: 0.7,
  light_blue: 0.7,
  purple: 0.7,
  pink: 0.7,
  light_green: 0.7,
  dark_green: 0.7,
  anomaly: 0.7,
};

export const DEFAULT_MASK_VISIBILITY = {
  red: true,
  yellow: true,
  green: true,
  brown: true,
  light_blue: true,
  purple: true,
  pink: true,
  light_green: true,
  dark_green: true,
};

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