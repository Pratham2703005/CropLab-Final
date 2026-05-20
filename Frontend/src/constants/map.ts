
const MAP_API_KEY = import.meta.env.VITE_MAP_API_KEY;

export const DEFAULT_MAP_CENTER = {
  LAT: import.meta.env.VITE_MAP_DEFAULT_CENTER_LAT,
  LNG: import.meta.env.VITE_MAP_DEFAULT_CENTER_LNG
}; // Agra
export const MAP_STYLES = {
  HYBRID: 'hybrid',
  SATELLITE: 'satellite',
  STREETS: 'streets',
  TERRAIN: 'terrain',
} as const;

export const MAPS = {
  [MAP_STYLES.HYBRID]: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAP_API_KEY}`,
  [MAP_STYLES.SATELLITE]: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${MAP_API_KEY}`,
  [MAP_STYLES.STREETS]: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAP_API_KEY}`,
  [MAP_STYLES.TERRAIN]: `https://api.maptiler.com/maps/terrain/{z}/{x}/{y}.png?key=${MAP_API_KEY}`,
};

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

export const NDVI_MASK_SET = [
  {
    id: 'red' as const, 
    name: 'Stressed Areas',
    color: '#ef4444',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.red,
    visible: DEFAULT_MASK_VISIBILITY.red,
  },
  {
    id: 'yellow' as const,
    name: 'Moderate Health',
    color: '#eab308',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.yellow,
    visible: DEFAULT_MASK_VISIBILITY.yellow,
  },
  {
    id: 'green' as const,
    name: 'Healthy Areas',
    color: '#22c55e',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.green,
    visible: DEFAULT_MASK_VISIBILITY.green,
  },
];

export const NDWI_MASK_SET = [
  {
    id: 'brown' as const,
    name: 'Very Low Water',
    color: '#8B4513',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.brown,
    visible: DEFAULT_MASK_VISIBILITY.brown,
  },
  {
    id: 'yellow' as const,
    name: 'Low Water',
    color: '#eab308',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.yellow,
    visible: DEFAULT_MASK_VISIBILITY.yellow,
  },
  {
    id: 'light_blue' as const,
    name: 'Moderate Water',
    color: '#87CEFA',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.light_blue,
    visible: DEFAULT_MASK_VISIBILITY.light_blue,
  },
];

export const NDRE_MASK_SET = [
  {
    id: 'purple' as const,
    name: 'Stressed Vegetation',
    color: '#800080',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.purple,
    visible: DEFAULT_MASK_VISIBILITY.purple,
  },
  {
    id: 'pink' as const,
    name: 'Moderate Stress',
    color: '#FF69B4',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.pink,
    visible: DEFAULT_MASK_VISIBILITY.pink,
  },
  {
    id: 'light_green' as const,
    name: 'Healthy',
    color: '#90EE90',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.light_green,
    visible: DEFAULT_MASK_VISIBILITY.light_green,
  },
  {
    id: 'dark_green' as const,
    name: 'Very Healthy',
    color: '#006400',
    base64Data: '',
    opacity: DEFAULT_MASK_OPACITY.dark_green,
    visible: DEFAULT_MASK_VISIBILITY.dark_green,
  },
];