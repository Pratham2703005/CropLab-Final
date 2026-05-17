
const MAP_API_KEY = import.meta.env.VITE_MAP_API_KEY;

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
