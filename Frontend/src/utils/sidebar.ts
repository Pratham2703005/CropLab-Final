import { NDRE_MASK_SET, NDVI_MASK_SET, NDWI_MASK_SET } from '@/constants/map';
import type { HealthLabel, HealthTrendInfo, BandShare } from '@/types/sidebar';
import type { MaskOverlay } from '@/types/map';
import type { HeatmapData } from '@/types/farm';
import { HEALTH_TRENDS } from '@/constants/sidebar';

/**
 * Derives overall crop health status based on risk score
 * Risk score is calculated as: redPct * 0.7 + yellowPct * 0.3
 * @param riskScore - Calculated risk score (0-100)
 * @returns Health label: Critical, Poor, Moderate, Good, or Excellent
 */
export const deriveOverallHealth = (riskScore: number): HealthLabel => {
  if (riskScore >= 60) return 'Critical';
  else if (riskScore >= 40) return 'Poor';
  else if (riskScore >= 25) return 'Moderate';
  else if (riskScore >= 10) return 'Good';
  else return 'Excellent';
};

/**
 * Computes a 0-100 crop risk score from NDVI pixel counts.
 *
 * Risk weights stressed (red) pixels at 0.7 and moderate (yellow) at 0.3;
 * healthy (green) pixels add no risk. The denominator is the `valid` pixel
 * count when available, otherwise the sum of red/yellow/green.
 *
 * @param pixelCounts - NDVI pixel counts, or undefined when no analysis exists
 * @returns Risk score clamped to 0-100 (0 when there is no pixel data)
 */
export const computeRiskScore = (
  pixelCounts: HeatmapData['pixel_counts'] | undefined
): number => {
  const totalPixels =
    (pixelCounts?.valid && pixelCounts.valid > 0
      ? pixelCounts.valid
      : (pixelCounts?.red ?? 0) +
        (pixelCounts?.yellow ?? 0) +
        (pixelCounts?.green ?? 0)) || 0;
  if (totalPixels <= 0) return 0;
  const yellowPct = ((pixelCounts?.yellow ?? 0) / totalPixels) * 100;
  const redPct = ((pixelCounts?.red ?? 0) / totalPixels) * 100;
  return Math.max(0, Math.min(100, redPct * 0.7 + yellowPct * 0.3));
};

/**
 * Computes health trend from NDVI historical data
 * Compares latest NDVI value against average of prior years
 * @param ndviTrend - Array of NDVI data points with dates and values
 * @returns Trend info: direction (improving/stable/declining), delta %, prior years count
 */
export const computeHealthTrend = (
  ndviTrend: { date: string; mean_ndvi: number }[] | undefined
): HealthTrendInfo => {
  if (!ndviTrend || ndviTrend.length < 2) {
    return { direction: null, deltaPct: 0, priorYearsCount: 0 };
  }
  const sorted = ndviTrend
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1]!.mean_ndvi;
  const priorPoints = sorted.slice(0, -1);
  const priorAvg =
    priorPoints.reduce((sum, p) => sum + p.mean_ndvi, 0) / priorPoints.length;
  if (!Number.isFinite(latest) || !Number.isFinite(priorAvg) || priorAvg <= 0) {
    return { direction: null, deltaPct: 0, priorYearsCount: 0 };
  }
  const deltaPct = ((latest - priorAvg) / Math.abs(priorAvg)) * 100;
  const priorYearsCount = priorPoints.length;
  if (Math.abs(deltaPct) < 3) {
    return { direction: HEALTH_TRENDS.STABLE, deltaPct, priorYearsCount };
  }
  return {
    direction: deltaPct > 0 ? HEALTH_TRENDS.IMPROVING : HEALTH_TRENDS.DECLINING,
    deltaPct,
    priorYearsCount,
  };
};

/**
 * Computes percentage shares for each band from pixel counts
 * @param counts - Dictionary of pixel counts keyed by mask id (e.g., { green: 1000, yellow: 500, red: 100 })
 * @param bands - Mask overlay array defining available bands
 * @returns Array of band shares with percentages, or null if no valid data
 */
export const computeBandShares = (
  counts: Record<string, number | undefined> | undefined,
  bands: MaskOverlay[]
): BandShare[] | null => {
  if (!counts) return null;
  const total = bands.reduce(
    (sum, b) => sum + Math.max(0, Number(counts[b.id] ?? 0)),
    0
  );
  if (total <= 0) return null;
  return bands.map(b => ({
    spec: b,
    pct: (Math.max(0, Number(counts[b.id] ?? 0)) / total) * 100,
  }));
};

/**
 * Generates placeholder band data when no actual data is available
 * Used to maintain consistent row heights in UI
 * @param label - Band row label (e.g., 'Health (NDVI)', 'Water (NDWI)')
 * @returns Array of band shares with 0% values
 */
export const bandsPlaceholder = (label: string): BandShare[] => {
  const specs = label.includes('NDVI')
    ? NDVI_MASK_SET
    : label.includes('NDWI')
      ? NDWI_MASK_SET
      : NDRE_MASK_SET;
  return specs.map(spec => ({ spec, pct: 0 }));
};

/**
 * Formats analysis date string (YYYY-MM-DD) to localized display format
 * @param raw - Date string in YYYY-MM-DD format (or undefined)
 * @returns Formatted date like "15 Sep 2025", or null if invalid/missing
 */
export const formatAnalysisDate = (raw?: string): string | null => {
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

