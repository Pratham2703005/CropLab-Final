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

export const CROP_OPTIONS = [
  'Wheat',
  'Rice',
  'Corn',
  'Soybeans',
  'Cotton',
  'Sugarcane',
  'Potato',
  'Tomato',
  'Onion',
  'Cabbage',
  'Carrot',
  'Beans',
  'Peas',
  'Sunflower',
  'Barley',
  'Oats',
] as const;


// Crop calendar with cultivation and harvest months
export const CROP_CALENDAR: Record<typeof CROP_OPTIONS[number], { cultivation: string[]; harvest: string[] }> = {
  Wheat: {
    cultivation: ['Oct', 'Nov', 'Dec'],
    harvest: ['Mar', 'Apr'],
  },
  Rice: {
    cultivation: ['Jun', 'Jul'],
    harvest: ['Oct', 'Nov'],
  },
  Corn: {
    cultivation: ['Jun', 'Jul'],
    harvest: ['Sep', 'Oct'],
  },
  Soybeans: {
    cultivation: ['Jun', 'Jul'],
    harvest: ['Oct', 'Nov'],
  },
  Cotton: {
    cultivation: ['Apr', 'May', 'Jun'],
    harvest: ['Nov', 'Dec', 'Jan'],
  },
  Sugarcane: {
    cultivation: ['Feb', 'Mar', 'Oct', 'Nov'],
    harvest: ['Nov', 'Dec', 'Jan', 'Feb'],
  },
  Potato: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Jan', 'Feb'],
  },
  Tomato: {
    cultivation: ['Jun', 'Jul', 'Nov', 'Dec'],
    harvest: ['Sep', 'Oct', 'Feb', 'Mar'],
  },
  Onion: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Feb', 'Mar'],
  },
  Cabbage: {
    cultivation: ['Sep', 'Oct'],
    harvest: ['Jan', 'Feb'],
  },
  Carrot: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Jan', 'Feb'],
  },
  Beans: {
    cultivation: ['Jun', 'Jul'],
    harvest: ['Sep', 'Oct'],
  },
  Peas: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Jan', 'Feb'],
  },
  Sunflower: {
    cultivation: ['Jan', 'Feb', 'Jun', 'Jul'],
    harvest: ['Apr', 'May', 'Sep', 'Oct'],
  },
  Barley: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Mar', 'Apr'],
  },
  Oats: {
    cultivation: ['Oct', 'Nov'],
    harvest: ['Mar', 'Apr'],
  },
};