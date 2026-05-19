/**
 * Pure, framework-free helpers for farm data — form validation and crop
 * calendar maths. Kept side-effect free so they're trivial to unit test
 * (see farm.test.ts) and reusable from any hook or component.
 */
import { CROP_CALENDAR } from '@/constants/farm';
import type { Farm } from '@/types/farm';

/**
 * Validate a farm's planting/harvest date pair.
 *
 * Dates are the `YYYY-MM-DD` strings produced by `<input type="date">`, so a
 * lexicographic comparison is also a chronological one.
 *
 * @returns the first problem as a human-readable message, or `null` if valid.
 */
export function validateFarmDates(
  plantingDate: string | undefined,
  harvestDate: string | undefined
): string | null {
  if (!plantingDate) return 'Please select a planting date';
  if (!harvestDate) return 'Please select a harvest date';
  if (harvestDate <= plantingDate) {
    return 'Harvest date must be after planting date';
  }
  return null;
}

/**
 * Validate a complete farm create/edit submission: the date pair plus a drawn
 * boundary. Checks run in a fixed order and the first failure short-circuits.
 *
 * @returns the first problem as a human-readable message, or `null` if valid.
 */
export function validateFarmForm(input: {
  plantingDate?: string;
  harvestDate?: string;
  coordinates: number[][];
}): string | null {
  const dateError = validateFarmDates(input.plantingDate, input.harvestDate);
  if (dateError) return dateError;
  if (input.coordinates.length === 0) {
    return 'Please draw your farm boundary on the map';
  }
  return null;
}

/**
 * Convert a 3-letter month name (`Jan`–`Dec`) to its 1-12 number.
 * An unrecognised name falls back to 1 (January).
 */
export function monthNameToNumber(monthName: string): number {
  const months: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  return months[monthName] || 1;
}

/**
 * Derive default planting and harvest dates for a crop from its sowing/
 * harvest calendar, relative to a reference date.
 *
 * @param cropName an arbitrary string; an unknown crop yields empty dates.
 * @param referenceDate the "now" the result is calculated against.
 * @returns `YYYY-MM-DD` planting/harvest dates, or empty strings for an
 *   unknown crop.
 */
export function calculateCropDates(
  cropName: string,
  referenceDate: Date = new Date()
): { plantingDate: string; harvestDate: string } {
  // cropName is an arbitrary string — look it up against the known crops and
  // fall back when it isn't one (noUncheckedIndexedAccess makes this safe).
  const calendar = CROP_CALENDAR[cropName as keyof typeof CROP_CALENDAR];
  if (!calendar) {
    return { plantingDate: '', harvestDate: '' };
  }

  const currentMonth = referenceDate.getMonth() + 1; // 1-12
  const currentYear = referenceDate.getFullYear();

  // Convert cultivation and harvest months to numbers
  const cultivationMonths = calendar.cultivation.map(monthNameToNumber);
  const harvestMonths = calendar.harvest.map(monthNameToNumber);

  // Find the cultivation month - prioritize past cultivations
  let plantingYear = currentYear;
  const plantingMonth = cultivationMonths[0]!;

  // If earliest cultivation month hasn't occurred yet this year, look back to last year
  if (plantingMonth > currentMonth) {
    plantingYear = currentYear - 1;
  }

  // Find harvest month - use the first one after the cultivation period ends
  const maxCultivationMonth = Math.max(...cultivationMonths);
  let harvestYear = plantingYear;
  const harvestMonth = harvestMonths[0]!;

  // If harvest month is in an earlier month than max cultivation, it's in the next year
  if (harvestMonth <= maxCultivationMonth) {
    harvestYear = plantingYear + 1;
  }

  const plantingDateString = `${plantingYear}-${String(plantingMonth).padStart(2, '0')}-01`;
  const harvestDateString = `${harvestYear}-${String(harvestMonth).padStart(2, '0')}-01`;

  return { plantingDate: plantingDateString, harvestDate: harvestDateString };
}

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
