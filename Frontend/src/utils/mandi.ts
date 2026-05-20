import { MONTH_NAMES } from '@/constants';
import type { AgmarknetData, MonthNames, Unit } from '@/types';

/**
 * Parses an Agmarknet `prices_<month>_<year>` key into a `[year, month]` pair.
 * Month is 1-12 (0 when the month name is unknown). Year is NaN for malformed
 * keys with no trailing year segment.
 */
export const parsePriceKey = (key: string): readonly [number, number] => {
  const parts = key.replace('prices_', '').split('_');
  const year = parseInt(parts[parts.length - 1] ?? '0', 10);
  const monthIdx = MONTH_NAMES.indexOf(
    (parts[0] ?? '').toLowerCase() as MonthNames
  );
  return [year, monthIdx + 1] as const;
};

/**
 * Formats a `prices_<month>_<year>` key as a chart-friendly `Mmm YY` label
 * (e.g. `prices_january_2025` → `Jan 25`).
 */
export const formatPriceKey = (key: string): string => {
  const parts = key.replace('prices_', '').split('_');
  const monthShort = (parts[0] ?? '').slice(0, 3);
  const monthLabel =
    monthShort.charAt(0).toUpperCase() + monthShort.slice(1).toLowerCase();
  const year = parts[parts.length - 1] ?? '';
  return `${monthLabel} ${year.slice(2)}`;
};

/**
 * Returns the sorted, deduped, trimmed set of district names from agmarknet
 * rows. Non-string and whitespace-only district values are ignored.
 */
export const extractDistricts = (
  rows: AgmarknetData['rows'] | undefined
): string[] => {
  if (!rows || !Array.isArray(rows)) return [];
  const set = new Set<string>();
  rows.forEach(row => {
    const d = row.district;
    if (typeof d === 'string' && d.trim()) set.add(d.trim());
  });
  return Array.from(set).sort();
};

/**
 * Picks the initial district for the selector: prefers a case-insensitive
 * match against `detectedDistrict`, otherwise falls back to the first district.
 * Returns undefined when `districts` is empty.
 */
export const resolveInitialDistrict = (
  districts: string[],
  detectedDistrict: string | undefined
): string | undefined => {
  if (districts.length === 0) return undefined;
  if (detectedDistrict) {
    const target = detectedDistrict.trim().toLowerCase();
    const match = districts.find(d => d.toLowerCase() === target);
    if (match) return match;
  }
  return districts[0];
};

export interface ChartPoint {
  month: string;
  key: string;
  district: number | null;
  stateAverage: number | null;
}

/**
 * Builds the per-month price series for the district-vs-state-average chart.
 * - Filters to `prices_*` keys, sorted by parsed year then month.
 * - Normalizes by unit: kg divides by 100; quintal is unchanged.
 * - Drops months where the district has no numeric price.
 */
export const buildChartData = (
  districtRow: Record<string, string | number | null>,
  stateAvg: Record<string, string | number | null> | undefined,
  unit: Unit
): ChartPoint[] => {
  const divisor = unit === 'kg' ? 100 : 1;
  const priceKeys = Object.keys(districtRow)
    .filter(key => key.startsWith('prices_'))
    .sort((a, b) => {
      const [ay, am] = parsePriceKey(a);
      const [by, bm] = parsePriceKey(b);
      return ay - by || am - bm;
    });

  return priceKeys
    .map(key => {
      const districtPrice = districtRow[key];
      const avgPrice = stateAvg?.[key];
      return {
        month: formatPriceKey(key),
        key,
        district:
          typeof districtPrice === 'number'
            ? +(districtPrice / divisor).toFixed(2)
            : null,
        stateAverage:
          typeof avgPrice === 'number'
            ? +(avgPrice / divisor).toFixed(2)
            : null,
      };
    })
    .filter(d => d.district !== null);
};
