import { NDRE_MASK_SET, NDVI_MASK_SET, NDWI_MASK_SET } from '@/constants/map';
import type {
  ActionItem,
  BandShare,
  ExtremeDeltas,
  HealthLabel,
  HealthTag,
  HealthTrend,
  HealthTrendInfo,
  InsightChip,
  NdviChartPoint,
  NdviDelta,
  NdviStats,
  PixelPercents,
  PriorityLabel,
  TopIssue,
} from '@/types/sidebar';
import type { MaskOverlay } from '@/types/map';
import type { HeatmapData } from '@/types/farm';
import {
  HEALTH_TRENDS,
  NDVI_ACTIONS,
  NDVI_COMPARISON_TEXT,
  NDVI_HEALTH_TAGS,
  NDVI_IMPACT_TEXT,
  NDVI_INSIGHT_CHIPS,
  NDVI_KEY_ISSUE_TEXT,
  NDVI_MICRO_INSIGHT_TEXT,
  NDVI_PANEL_COPY,
  NDVI_TOP_ISSUE_LABELS,
  NDVI_TREND_META,
  PRIORITY_LABELS,
} from '@/constants/sidebar';

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
 * The effective denominator for percent calculations over NDVI pixel counts:
 * `valid` when present and positive, otherwise the sum of red/yellow/green.
 * Returns 0 when no usable data exists.
 */
const getTotalPixels = (
  pixelCounts: HeatmapData['pixel_counts'] | undefined
): number => {
  return (
    (pixelCounts?.valid && pixelCounts.valid > 0
      ? pixelCounts.valid
      : (pixelCounts?.red ?? 0) +
        (pixelCounts?.yellow ?? 0) +
        (pixelCounts?.green ?? 0)) || 0
  );
};

/**
 * Stressed (red) and moderate (yellow) percentages of total valid pixels.
 * Shares its denominator with `computeRiskScore` so display percents and risk
 * score cannot diverge on the same data. Both percents are 0 when no pixels.
 */
export const derivePixelPercents = (
  pixelCounts: HeatmapData['pixel_counts'] | undefined
): PixelPercents => {
  const total = getTotalPixels(pixelCounts);
  if (total <= 0) return { stressedPercent: 0, moderatePercent: 0 };
  return {
    stressedPercent: ((pixelCounts?.red ?? 0) / total) * 100,
    moderatePercent: ((pixelCounts?.yellow ?? 0) / total) * 100,
  };
};

/**
 * Computes a 0-100 crop risk score from NDVI pixel counts.
 *
 * Risk weights stressed (red) pixels at 0.7 and moderate (yellow) at 0.3;
 * healthy (green) pixels add no risk.
 *
 * @param pixelCounts - NDVI pixel counts, or undefined when no analysis exists
 * @returns Risk score clamped to 0-100 (0 when there is no pixel data)
 */
export const computeRiskScore = (
  pixelCounts: HeatmapData['pixel_counts'] | undefined
): number => {
  const { stressedPercent, moderatePercent } = derivePixelPercents(pixelCounts);
  return Math.max(
    0,
    Math.min(100, stressedPercent * 0.7 + moderatePercent * 0.3)
  );
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

// --- NDVI Trends panel ---

/** Formats a date as a 4-digit year (e.g. `'2025'`). */
export const formatYearLabel = (date: Date): string =>
  String(date.getFullYear());

/** Formats a date as a long, localized label (e.g. `'15 Sep 2025'`). */
export const formatLongDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/**
 * Builds chart-ready NDVI points from the raw trend series.
 * Sorts ascending by date, parses each as midnight local time, and pre-formats
 * the labels used by the tooltip (`longLabel`) and X-axis (`axisLabel`).
 */
export const buildNdviChartData = (
  trend: { date: string; mean_ndvi: number }[] | undefined
): NdviChartPoint[] => {
  return (trend ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(point => {
      const date = new Date(`${point.date}T00:00:00`);
      return {
        date,
        ndvi: point.mean_ndvi,
        longLabel: formatLongDate(date),
        axisLabel: formatYearLabel(date),
      };
    });
};

/**
 * Summary stats for an NDVI series.
 *
 * - `averageNdvi` is `null` when there are no points.
 * - `variance` is population variance (divide by n); 0 for fewer than 2 points.
 * - `volatility` is `Math.sqrt(variance)`.
 * - `recentDelta` is `last.ndvi - secondToLast.ndvi`; 0 for fewer than 2 points.
 */
export const computeNdviStats = (points: { ndvi: number }[]): NdviStats => {
  const pointCount = points.length;
  const averageNdvi =
    pointCount > 0
      ? points.reduce((sum, p) => sum + p.ndvi, 0) / pointCount
      : null;
  const variance =
    pointCount > 1 && typeof averageNdvi === 'number'
      ? points.reduce((sum, p) => sum + (p.ndvi - averageNdvi) ** 2, 0) /
        pointCount
      : 0;
  const volatility = Math.sqrt(variance);
  const recentDelta =
    pointCount > 1
      ? points[pointCount - 1]!.ndvi - points[pointCount - 2]!.ndvi
      : 0;
  return { pointCount, averageNdvi, variance, volatility, recentDelta };
};

/**
 * Year-over-year NDVI deltas, one per consecutive pair.
 * For a series of n points, returns n-1 deltas; empty for n < 2.
 */
export const computeNdviDeltas = (
  points: { date: Date; ndvi: number }[]
): NdviDelta[] => {
  return points.slice(1).map((p, i) => ({
    date: p.date,
    delta: p.ndvi - points[i]!.ndvi,
  }));
};

/**
 * Finds the steepest negative delta (`sharpestDrop`) and the steepest positive
 * delta (`strongestRecovery`). Both are `null` for an empty deltas array.
 */
export const findExtremeDeltas = (deltas: NdviDelta[]): ExtremeDeltas => {
  const sharpestDrop = deltas.reduce<NdviDelta | null>(
    (acc, current) => (!acc || current.delta < acc.delta ? current : acc),
    null
  );
  const strongestRecovery = deltas.reduce<NdviDelta | null>(
    (acc, current) => (!acc || current.delta > acc.delta ? current : acc),
    null
  );
  return { sharpestDrop, strongestRecovery };
};

/**
 * Derives the "key issue" object from pixel percentages.
 *
 * - ≥ 5% stressed → "Stressed area" (priority High at ≥ 35%, else Medium).
 * - Otherwise ≥ 20% moderate → "Moderate-health area" with Medium priority.
 * - Otherwise null.
 */
export const deriveTopIssue = (
  stressedPercent: number,
  moderatePercent: number
): TopIssue | null => {
  if (stressedPercent >= 5) {
    return {
      name: NDVI_TOP_ISSUE_LABELS.STRESSED,
      affected_area_pct: stressedPercent,
      priority:
        stressedPercent >= 35
          ? PRIORITY_LABELS.HIGH
          : PRIORITY_LABELS.MEDIUM,
    };
  }
  if (moderatePercent >= 20) {
    return {
      name: NDVI_TOP_ISSUE_LABELS.MODERATE,
      affected_area_pct: moderatePercent,
      priority: PRIORITY_LABELS.MEDIUM,
    };
  }
  return null;
};

/**
 * Maps the latest NDVI value into a `{label, style}` tag for the panel header.
 * Returns the `unknown` tag when NDVI isn't a finite number.
 */
export const deriveHealthTag = (ndvi: number | undefined): HealthTag => {
  if (typeof ndvi !== 'number') return NDVI_HEALTH_TAGS.unknown;
  if (ndvi >= 0.6) return NDVI_HEALTH_TAGS.healthy;
  if (ndvi >= 0.4) return NDVI_HEALTH_TAGS.moderate;
  return NDVI_HEALTH_TAGS.stressed;
};

/**
 * Builds the 3-item "Action Priority" list for the NDVI panel: irrigation,
 * a top-issue control action (or nitrogen-boost fallback), and a scouting
 * action. Titles and urgency strings come from `NDVI_ACTIONS`.
 */
export const deriveActionItems = (params: {
  trendKey: HealthTrend;
  hasHighStress: boolean;
  topIssue: TopIssue | null;
}): ActionItem[] => {
  const { trendKey, hasHighStress, topIssue } = params;
  const irrigationUrgent =
    trendKey === HEALTH_TRENDS.DECLINING || hasHighStress;
  const irrigationCopy = irrigationUrgent
    ? NDVI_ACTIONS.irrigation.high
    : NDVI_ACTIONS.irrigation.normal;
  const scoutingCopy = hasHighStress
    ? NDVI_ACTIONS.scouting.high
    : NDVI_ACTIONS.scouting.normal;

  return [
    {
      title: irrigationCopy.title,
      priority: irrigationUrgent
        ? PRIORITY_LABELS.HIGH
        : PRIORITY_LABELS.MEDIUM,
      urgency: irrigationCopy.urgency,
    },
    {
      title: topIssue
        ? `${topIssue.name}${NDVI_ACTIONS.topIssue.controlSuffix}`
        : NDVI_ACTIONS.topIssue.fallbackTitle,
      priority:
        topIssue?.priority ??
        (trendKey === HEALTH_TRENDS.DECLINING
          ? PRIORITY_LABELS.MEDIUM
          : PRIORITY_LABELS.LOW),
      urgency:
        topIssue?.priority === PRIORITY_LABELS.HIGH
          ? NDVI_ACTIONS.topIssue.urgencyImmediate
          : NDVI_ACTIONS.topIssue.urgencyNormal,
    },
    {
      title: scoutingCopy.title,
      priority: hasHighStress
        ? PRIORITY_LABELS.HIGH
        : PRIORITY_LABELS.MEDIUM,
      urgency: scoutingCopy.urgency,
    },
  ];
};

/**
 * Picks the chips shown in the NDVI panel from trend + delta + volatility
 * signals. Falls back to the `Steady` chip when nothing else matched.
 */
export const deriveInsightChips = (params: {
  trendKey: HealthTrend;
  sharpestDrop: NdviDelta | null;
  strongestRecovery: NdviDelta | null;
  volatility: number;
}): InsightChip[] => {
  const { trendKey, sharpestDrop, strongestRecovery, volatility } = params;
  const chips: InsightChip[] = [];

  if (trendKey === HEALTH_TRENDS.IMPROVING) {
    chips.push(NDVI_INSIGHT_CHIPS.STABLE_GROWTH);
  }
  if (sharpestDrop && sharpestDrop.delta <= -0.03) {
    chips.push(NDVI_INSIGHT_CHIPS.SUDDEN_DROP);
  }
  if (strongestRecovery && strongestRecovery.delta >= 0.03) {
    chips.push(NDVI_INSIGHT_CHIPS.RECOVERY);
  }
  if (volatility >= 0.04) {
    chips.push(NDVI_INSIGHT_CHIPS.HIGH_VARIABILITY);
  } else if (volatility > 0 && volatility < 0.02) {
    chips.push(NDVI_INSIGHT_CHIPS.CONSISTENT);
  }
  if (chips.length === 0) {
    chips.push(NDVI_INSIGHT_CHIPS.STEADY);
  }

  return chips;
};

/**
 * Display label for a trend direction (e.g. `'Improving'`). Falls back to the
 * stable label when `trendKey` is `null`.
 */
export const deriveTrendLabel = (trendKey: HealthTrend): string => {
  const key = trendKey ?? HEALTH_TRENDS.STABLE;
  return NDVI_TREND_META[key].label;
};

/**
 * Per-trend insight sentence, or the "insufficient data" fallback when there
 * are fewer than 2 data points to compare.
 */
export const deriveTrendInsight = (
  trendKey: HealthTrend,
  pointCount: number
): string => {
  if (pointCount < 2) return NDVI_PANEL_COPY.insufficientTrendInsight;
  const key = trendKey ?? HEALTH_TRENDS.STABLE;
  return NDVI_TREND_META[key].insight;
};

/**
 * Builds the "Key Issue" sentence rendered under the chart.
 *
 * - With a `topIssue` → uses its name + affected % template.
 * - Without one but ≥ 40% stressed → uses the high-stress template.
 * - Otherwise → the "no major stress cluster" fallback.
 */
export const deriveKeyIssueText = (
  topIssue: TopIssue | null,
  stressedPercent: number
): string => {
  if (topIssue) {
    return NDVI_KEY_ISSUE_TEXT.topIssue(
      topIssue.affected_area_pct,
      topIssue.name
    );
  }
  if (stressedPercent >= 40) {
    return NDVI_KEY_ISSUE_TEXT.highStress(stressedPercent);
  }
  return NDVI_KEY_ISSUE_TEXT.noStress;
};

/**
 * One-line insight about the sharpest swing in the NDVI series. Returns the
 * "no swings" fallback when no deltas exist or neither extreme crosses ±0.03.
 */
export const deriveMicroInsight = (
  sharpestDrop: NdviDelta | null,
  strongestRecovery: NdviDelta | null
): string => {
  if (!sharpestDrop || !strongestRecovery) {
    return NDVI_MICRO_INSIGHT_TEXT.noSwings;
  }
  if (sharpestDrop.delta <= -0.03) {
    return NDVI_MICRO_INSIGHT_TEXT.drop(formatLongDate(sharpestDrop.date));
  }
  if (strongestRecovery.delta >= 0.03) {
    return NDVI_MICRO_INSIGHT_TEXT.recovery(
      formatLongDate(strongestRecovery.date)
    );
  }
  return NDVI_MICRO_INSIGHT_TEXT.noSwings;
};

/**
 * "Why it matters" sentence picked from trend × stress combination.
 */
export const deriveImpactText = (
  trendKey: HealthTrend,
  stressedPercent: number
): string => {
  if (trendKey === HEALTH_TRENDS.DECLINING && stressedPercent >= 40) {
    return NDVI_IMPACT_TEXT.decliningWidespread;
  }
  if (trendKey === HEALTH_TRENDS.DECLINING) return NDVI_IMPACT_TEXT.declining;
  if (trendKey === HEALTH_TRENDS.IMPROVING) return NDVI_IMPACT_TEXT.improving;
  return NDVI_IMPACT_TEXT.stable;
};

/**
 * Footnote under the smart-summary card. Falls back to the
 * "need at least two years" sentence when the chart can't compare endpoints.
 */
export const deriveComparisonText = (
  yearsSpanned: number,
  chartData: NdviChartPoint[]
): string => {
  if (
    yearsSpanned === 0 ||
    !chartData[0]?.date ||
    !chartData[chartData.length - 1]?.date
  ) {
    return NDVI_COMPARISON_TEXT.insufficient;
  }
  return NDVI_COMPARISON_TEXT.withYears(yearsSpanned);
};

/**
 * AI-priority badge label derived from the (already clamped) crop health score.
 * Lower scores = more urgent action.
 */
export const deriveAiPriority = (cropHealthScore: number): PriorityLabel => {
  if (cropHealthScore <= 35) return PRIORITY_LABELS.HIGH;
  if (cropHealthScore <= 65) return PRIORITY_LABELS.MEDIUM;
  return PRIORITY_LABELS.LOW;
};

/**
 * Tailwind class for the crop-health progress bar fill.
 */
export const deriveHealthColor = (cropHealthScore: number): string => {
  if (cropHealthScore >= 70) return 'bg-emerald-500';
  if (cropHealthScore >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};

/** Earliest/latest year endpoints of the chart series. */
const getYearSpan = (
  chartData: NdviChartPoint[]
): { from: number | null; to: number | null; hasSpan: boolean } => {
  const earliest = chartData[0];
  const latest = chartData[chartData.length - 1];
  const from = earliest ? earliest.date.getFullYear() : null;
  const to = latest ? latest.date.getFullYear() : null;
  const hasSpan = from !== null && to !== null && from !== to;
  return { from, to, hasSpan };
};

/**
 * "2023 → 2025" when the series spans more than one year, otherwise the
 * "same calendar window" fallback.
 */
export const formatYearSpanArrow = (chartData: NdviChartPoint[]): string => {
  const { from, to, hasSpan } = getYearSpan(chartData);
  return hasSpan ? `${from} → ${to}` : NDVI_PANEL_COPY.sameCalendarWindow;
};

/**
 * " from 2023 to 2025" when the series spans more than one year, otherwise
 * the "across the available years" fallback (both forms start with a space
 * so they slot directly into a flowing sentence).
 */
export const formatYearSpanPrefix = (chartData: NdviChartPoint[]): string => {
  const { from, to, hasSpan } = getYearSpan(chartData);
  if (hasSpan && from !== null && to !== null) {
    return NDVI_PANEL_COPY.fromYearToYear(from, to);
  }
  return NDVI_PANEL_COPY.acrossAvailableYears;
};

