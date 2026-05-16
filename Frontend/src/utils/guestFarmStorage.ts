/**
 * Calculate polygon area using Shoelace formula
 */
export function calculatePolygonArea(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const curr = coordinates[i];
    const next = coordinates[(i + 1) % n];
    if (
      Array.isArray(curr) &&
      Array.isArray(next) &&
      typeof curr[0] === 'number' &&
      typeof curr[1] === 'number' &&
      typeof next[0] === 'number' &&
      typeof next[1] === 'number'
    ) {
      area += curr[0] * next[1];
      area -= next[0] * curr[1];
    }
  }
  return Math.abs(area) / 2;
}
import type { Farm, FarmFormData } from '../types/farm';
import { isShowcaseFarmId } from './showcaseFarms';

const GUEST_FARMS_KEY = 'CropLab_guest_farms';
const GUEST_COUNTER_KEY = 'CropLab_guest_counter';

// GuestFarm type for localStorage
export type GuestFarm = Omit<Farm, 'userId'> & {
  isGuest: true;
};

/**
 * Utility class for managing guest farms in localStorage
 */
export class GuestFarmStorage {
  /**
   * Get next available ID for guest farms.
   *
   * Guest farms and showcase farms share the `guest_N` id scheme (showcase
   * farms are exported guest farms). If the counter ever resets, a new guest
   * farm could be assigned an id that collides with a showcase farm — which
   * the dashboard would then silently drop as a duplicate. So skip any id
   * already used by a showcase farm.
   */
  private static getNextId(): string {
    let counter = parseInt(localStorage.getItem(GUEST_COUNTER_KEY) || '0', 10);
    let id: string;
    do {
      counter += 1;
      id = `guest_${counter}`;
    } while (isShowcaseFarmId(id));
    localStorage.setItem(GUEST_COUNTER_KEY, counter.toString());
    return id;
  }

  /**
   * Get all guest farms from localStorage.
   *
   * Self-heals any stored farm whose id collides with a showcase farm id
   * (can happen if a farm was created while the counter was behind) by
   * re-assigning a fresh non-colliding id and persisting the fix.
   */
  static getFarms(): GuestFarm[] {
    try {
      const farmsJson = localStorage.getItem(GUEST_FARMS_KEY);
      if (!farmsJson) return [];

      const parsed = JSON.parse(farmsJson);
      if (!Array.isArray(parsed)) return [];

      let changed = false;
      const farms: GuestFarm[] = parsed.map((farm: GuestFarm) => {
        if (farm && typeof farm.id === 'string' && isShowcaseFarmId(farm.id)) {
          changed = true;
          return { ...farm, id: this.getNextId() };
        }
        return farm;
      });
      if (changed) {
        localStorage.setItem(GUEST_FARMS_KEY, JSON.stringify(farms));
      }
      return farms;
    } catch (error) {
      console.error('Error parsing guest farms from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a single guest farm by ID
   */
  static getFarmById(id: string): GuestFarm | undefined {
    const farms = this.getFarms();
    return farms.find(farm => farm.id === id);
  }

  /**
   * Add a new guest farm
   */
  static addFarm(
    farmData: FarmFormData,
    coordinates: number[][],
    area: number
  ): GuestFarm {
    const farms = this.getFarms();
    const now = new Date().toISOString();

    const newFarm: GuestFarm = {
      id: this.getNextId(),
      ...farmData,
      description: farmData.description ?? '',
      coordinates,
      area,
      createdAt: now,
      updatedAt: now,
      isGuest: true,
    };

    farms.push(newFarm);
    localStorage.setItem(GUEST_FARMS_KEY, JSON.stringify(farms));

    return newFarm;
  }

  /**
   * Update an existing guest farm
   */
  static updateFarm(
    id: string,
    updateData: Partial<
      FarmFormData & { coordinates?: number[][]; area?: number }
    >
  ): GuestFarm | null {
    const farms = this.getFarms();
    const farmIndex = farms.findIndex(farm => farm.id === id);

    if (farmIndex === -1) {
      console.warn(`Guest farm with ID ${id} not found`);
      return null;
    }

    const farm = farms[farmIndex];
    const updatedFarm: GuestFarm = {
      id: farm?.id ?? id,
      name: updateData.name ?? farm?.name ?? '',
      crop: updateData.crop ?? farm?.crop ?? '',
      plantingDate: updateData.plantingDate ?? farm?.plantingDate ?? '',
      harvestDate: updateData.harvestDate ?? farm?.harvestDate ?? '',
      description: updateData.description ?? farm?.description ?? '',
      coordinates: updateData.coordinates ?? farm?.coordinates ?? [],
      area: updateData.area ?? farm?.area ?? 0,
      createdAt: farm?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuest: true,
    };

    farms[farmIndex] = updatedFarm;
    localStorage.setItem(GUEST_FARMS_KEY, JSON.stringify(farms));

    return updatedFarm;
  }

  /**
   * Delete a guest farm
   */
  static deleteFarm(id: string): boolean {
    const farms = this.getFarms();
    const filteredFarms = farms.filter(farm => farm.id !== id);

    if (filteredFarms.length === farms.length) {
      console.warn(`Guest farm with ID ${id} not found`);
      return false;
    }

    localStorage.setItem(GUEST_FARMS_KEY, JSON.stringify(filteredFarms));
    return true;
  }

  /**
   * Clear all guest farms (used after migration)
   */
  static clearAllFarms(): void {
    localStorage.removeItem(GUEST_FARMS_KEY);
    localStorage.removeItem(GUEST_COUNTER_KEY);
  }

  /**
   * Get guest farms count
   */
  static getCount(): number {
    return this.getFarms().length;
  }

  /**
   * Check if there are any guest farms
   */
  static hasGuestFarms(): boolean {
    return this.getCount() > 0;
  }
}

export default GuestFarmStorage;
