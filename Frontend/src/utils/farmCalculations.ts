import type { Farm } from '@/types/farm';

/**
 * Calculate total area across all farms
 * Pure function for easy testing
 */
export function calculateTotalArea(farms: Farm[]): number {
  return farms.reduce((sum: number, farm: Farm) => {
    const area = farm.area || 0;
    return sum + area;
  }, 0);
}

/**
 * Get count of unique crop varieties
 * Pure function for easy testing
 */
export function getActiveCropsCount(farms: Farm[]): number {
  return new Set(farms.map((farm: Farm) => farm.crop)).size;
}
