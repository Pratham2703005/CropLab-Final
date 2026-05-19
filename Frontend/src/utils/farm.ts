/**
 * Pure, framework-free helpers for farm form data. Kept side-effect free so
 * they're trivial to unit test (see farm.test.ts) and reusable from any hook
 * or component — the caller decides how to surface the result (toast, inline
 * error, etc.).
 */

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
