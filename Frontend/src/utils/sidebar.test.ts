import { describe, it, expect } from 'vitest';
import {
  deriveOverallHealth,
  computeRiskScore,
  computeHealthTrend,
  computeBandShares,
  bandsPlaceholder,
  formatAnalysisDate,
  buildNdviChartData,
  computeNdviStats,
  computeNdviDeltas,
  findExtremeDeltas,
  derivePixelPercents,
  deriveTopIssue,
  deriveHealthTag,
  deriveActionItems,
  deriveInsightChips,
  deriveTrendLabel,
  deriveTrendInsight,
  deriveKeyIssueText,
  deriveMicroInsight,
  deriveImpactText,
  deriveComparisonText,
  deriveAiPriority,
  deriveHealthColor,
  formatYearSpanArrow,
  formatYearSpanPrefix,
} from './sidebar';
import type {
  HealthLabel,
  HealthTrend,
  NdviChartPoint,
  NdviDelta,
  TopIssue,
} from '@/types/sidebar';
import type { HeatmapData, MaskOverlay } from '@/types';
import { NDVI_MASK_SET, NDWI_MASK_SET } from '@/constants/map';
import {
  HEALTH_TRENDS,
  NDVI_COMPARISON_TEXT,
  NDVI_IMPACT_TEXT,
  NDVI_KEY_ISSUE_TEXT,
  NDVI_MICRO_INSIGHT_TEXT,
  NDVI_PANEL_COPY,
  NDVI_TREND_META,
} from '@/constants/sidebar';

type PixelCounts = HeatmapData['pixel_counts'];
type NdviTrend = { date: string; mean_ndvi: number }[];

describe('sidebar', () => {
  describe('deriveOverallHealth', () => {
    it.each<{
      name: string;
      riskScore: number;
      expected: HealthLabel;
    }>([
      // Excellent: < 10
      { name: 'very low risk', riskScore: 0, expected: 'Excellent' },
      { name: 'low risk boundary', riskScore: 9.99, expected: 'Excellent' },
      // Good: 10-24
      { name: 'good health boundary', riskScore: 10, expected: 'Good' },
      { name: 'good health mid-range', riskScore: 15, expected: 'Good' },
      { name: 'moderate boundary', riskScore: 24.99, expected: 'Good' },
      // Moderate: 25-39
      { name: 'moderate boundary', riskScore: 25, expected: 'Moderate' },
      { name: 'moderate mid-range', riskScore: 32, expected: 'Moderate' },
      { name: 'poor boundary', riskScore: 39.99, expected: 'Moderate' },
      // Poor: 40-59
      { name: 'poor boundary', riskScore: 40, expected: 'Poor' },
      { name: 'poor mid-range', riskScore: 50, expected: 'Poor' },
      { name: 'critical boundary', riskScore: 59.99, expected: 'Poor' },
      // Critical: >= 60
      { name: 'critical boundary', riskScore: 60, expected: 'Critical' },
      { name: 'severe stress', riskScore: 100, expected: 'Critical' },
    ])('returns $expected for $name', ({ riskScore, expected }) => {
      expect(deriveOverallHealth(riskScore)).toBe(expected);
    });
  });

  describe('computeRiskScore', () => {
    it.each<{
      name: string;
      counts: PixelCounts | undefined;
      expected: number;
    }>([
      { name: 'undefined counts', counts: undefined, expected: 0 },
      {
        name: 'no pixels',
        counts: { valid: 0, red: 0, yellow: 0, green: 0 },
        expected: 0,
      },
      {
        name: 'an all-healthy field',
        counts: { valid: 100, red: 0, yellow: 0, green: 100 },
        expected: 0,
      },
      {
        // 20% red, 30% yellow -> 20*0.7 + 30*0.3
        name: 'red weighted 0.7 and yellow 0.3',
        counts: { valid: 0, red: 20, yellow: 30, green: 50 },
        expected: 23,
      },
      {
        // 100% yellow -> 100*0.3
        name: 'a yellow-only field',
        counts: { valid: 0, red: 0, yellow: 100, green: 0 },
        expected: 30,
      },
      {
        // valid count used as denominator -> 50/200 = 25% red
        name: 'valid count as the denominator',
        counts: { valid: 200, red: 50, yellow: 0, green: 50 },
        expected: 17.5,
      },
      {
        // valid is 0 -> denominator falls back to red+yellow+green
        name: 'fallback denominator when valid is 0',
        counts: { valid: 0, red: 50, yellow: 0, green: 50 },
        expected: 35,
      },
      {
        // all red caps at the red weight (0.7 * 100)
        name: 'an all-stressed field',
        counts: { valid: 100, red: 100, yellow: 0, green: 0 },
        expected: 70,
      },
    ])('returns $expected for $name', ({ counts, expected }) => {
      expect(computeRiskScore(counts)).toBeCloseTo(expected);
    });
  });

  describe('computeHealthTrend', () => {
    it.each<{
      name: string;
      input: NdviTrend | undefined;
      direction: HealthTrend;
      deltaPct: number;
      priorYears: number;
    }>([
      {
        name: 'no data',
        input: undefined,
        direction: null,
        deltaPct: 0,
        priorYears: 0,
      },
      {
        name: 'a single data point',
        input: [{ date: '2025-01-01', mean_ndvi: 0.5 }],
        direction: null,
        deltaPct: 0,
        priorYears: 0,
      },
      {
        // (0.5 - 0.4) / 0.4 = +25%
        name: 'an improving trend',
        input: [
          { date: '2024-01-01', mean_ndvi: 0.4 },
          { date: '2025-01-01', mean_ndvi: 0.5 },
        ],
        direction: HEALTH_TRENDS.IMPROVING,
        deltaPct: 25,
        priorYears: 1,
      },
      {
        // (0.5 - 0.6) / 0.6 = -16.7%
        name: 'a declining trend',
        input: [
          { date: '2024-01-01', mean_ndvi: 0.6 },
          { date: '2025-01-01', mean_ndvi: 0.5 },
        ],
        direction: HEALTH_TRENDS.DECLINING,
        deltaPct: -16.7,
        priorYears: 1,
      },
      {
        // delta < 3% reads as stable
        name: 'a stable trend',
        input: [
          { date: '2024-01-01', mean_ndvi: 0.5 },
          { date: '2025-01-01', mean_ndvi: 0.51 },
        ],
        direction: HEALTH_TRENDS.STABLE,
        deltaPct: 2,
        priorYears: 1,
      },
      {
        name: 'unsorted input (sorted by date internally)',
        input: [
          { date: '2025-01-01', mean_ndvi: 0.5 },
          { date: '2024-01-01', mean_ndvi: 0.4 },
        ],
        direction: HEALTH_TRENDS.IMPROVING,
        deltaPct: 25,
        priorYears: 1,
      },
      {
        // prior avg of (0.4, 0.45) = 0.425; (0.6 - 0.425) / 0.425 = +41.2%
        name: 'multiple prior years',
        input: [
          { date: '2023-01-01', mean_ndvi: 0.4 },
          { date: '2024-01-01', mean_ndvi: 0.45 },
          { date: '2025-01-01', mean_ndvi: 0.6 },
        ],
        direction: HEALTH_TRENDS.IMPROVING,
        deltaPct: 41.2,
        priorYears: 2,
      },
      {
        name: 'invalid (NaN) NDVI values',
        input: [
          { date: '2024-01-01', mean_ndvi: NaN },
          { date: '2025-01-01', mean_ndvi: 0.5 },
        ],
        direction: null,
        deltaPct: 0,
        priorYears: 0,
      },
      {
        name: 'a non-positive prior baseline',
        input: [
          { date: '2024-01-01', mean_ndvi: 0 },
          { date: '2025-01-01', mean_ndvi: 0.5 },
        ],
        direction: null,
        deltaPct: 0,
        priorYears: 0,
      },
    ])('handles $name', ({ input, direction, deltaPct, priorYears }) => {
      const result = computeHealthTrend(input);
      expect(result.direction).toBe(direction);
      expect(result.deltaPct).toBeCloseTo(deltaPct, 1);
      expect(result.priorYearsCount).toBe(priorYears);
    });
  });

  describe('computeBandShares', () => {
    it.each<{
      name: string;
      counts: Record<string, number> | undefined;
      bands: MaskOverlay[];
      expected: number[] | null;
    }>([
      {
        name: 'undefined counts',
        counts: undefined,
        bands: NDVI_MASK_SET,
        expected: null,
      },
      { name: 'empty counts', counts: {}, bands: NDVI_MASK_SET, expected: null },
      {
        name: 'all-zero counts',
        counts: { red: 0, yellow: 0, green: 0 },
        bands: NDVI_MASK_SET,
        expected: null,
      },
      {
        // NDVI_MASK_SET is ordered red, yellow, green
        name: 'NDVI percentages in mask order',
        counts: { green: 50, yellow: 30, red: 20 },
        bands: NDVI_MASK_SET,
        expected: [20, 30, 50],
      },
      {
        name: 'missing keys treated as zero',
        counts: { green: 100 },
        bands: NDVI_MASK_SET,
        expected: [0, 0, 100],
      },
      {
        name: 'negative counts clamped to zero',
        counts: { red: -10, yellow: 0, green: 110 },
        bands: NDVI_MASK_SET,
        expected: [0, 0, 100],
      },
      {
        // NDWI_MASK_SET is ordered brown, yellow, light_blue
        name: 'NDWI percentages in mask order',
        counts: { light_blue: 40, yellow: 35, brown: 25 },
        bands: NDWI_MASK_SET,
        expected: [25, 35, 40],
      },
    ])('returns $expected for $name', ({ counts, bands, expected }) => {
      const shares = computeBandShares(counts, bands);
      if (expected === null) {
        expect(shares).toBeNull();
        return;
      }
      expect(shares).not.toBeNull();
      expect(shares).toHaveLength(expected.length);
      expected.forEach((pct, i) => expect(shares![i]?.pct).toBeCloseTo(pct));
    });
  });

  describe('bandsPlaceholder', () => {
    it.each<{
      name: string;
      label: string;
      length: number;
      firstId: string;
    }>([
      { name: 'NDVI label', label: 'Health (NDVI)', length: 3, firstId: 'red' },
      {
        name: 'NDWI label',
        label: 'Water (NDWI)',
        length: 3,
        firstId: 'brown',
      },
      {
        name: 'NDRE label',
        label: 'Nutrition (NDRE)',
        length: 4,
        firstId: 'purple',
      },
      {
        name: 'unknown label (defaults to NDRE)',
        label: 'Unknown',
        length: 4,
        firstId: 'purple',
      },
    ])('returns zeroed bands for $name', ({ label, length, firstId }) => {
      const placeholder = bandsPlaceholder(label);
      expect(placeholder).toHaveLength(length);
      expect(placeholder[0]?.spec.id).toBe(firstId);
      expect(placeholder.every(b => b.pct === 0)).toBe(true);
    });
  });

  describe('buildNdviChartData', () => {
    it.each<{
      name: string;
      input: { date: string; mean_ndvi: number }[] | undefined;
      expectedYears: string[];
      expectedNdvis: number[];
    }>([
      {
        name: 'undefined input',
        input: undefined,
        expectedYears: [],
        expectedNdvis: [],
      },
      { name: 'empty array', input: [], expectedYears: [], expectedNdvis: [] },
      {
        name: 'single point',
        input: [{ date: '2025-01-15', mean_ndvi: 0.5 }],
        expectedYears: ['2025'],
        expectedNdvis: [0.5],
      },
      {
        name: 'sorts ascending by date',
        input: [
          { date: '2025-01-01', mean_ndvi: 0.6 },
          { date: '2023-01-01', mean_ndvi: 0.4 },
          { date: '2024-01-01', mean_ndvi: 0.5 },
        ],
        expectedYears: ['2023', '2024', '2025'],
        expectedNdvis: [0.4, 0.5, 0.6],
      },
    ])('$name', ({ input, expectedYears, expectedNdvis }) => {
      const result = buildNdviChartData(input);
      expect(result.map(p => p.axisLabel)).toEqual(expectedYears);
      expect(result.map(p => p.ndvi)).toEqual(expectedNdvis);
    });

    it('parses YYYY-MM-DD into Date and formats longLabel', () => {
      const result = buildNdviChartData([
        { date: '2025-01-15', mean_ndvi: 0.5 },
      ]);
      expect(result[0]?.date.getFullYear()).toBe(2025);
      expect(result[0]?.longLabel).toMatch(/Jan.*15.*2025/);
    });
  });

  describe('computeNdviStats', () => {
    it.each<{
      name: string;
      points: { ndvi: number }[];
      pointCount: number;
      averageNdvi: number | null;
      volatility: number;
      recentDelta: number;
    }>([
      {
        name: 'empty series',
        points: [],
        pointCount: 0,
        averageNdvi: null,
        volatility: 0,
        recentDelta: 0,
      },
      {
        name: 'single point',
        points: [{ ndvi: 0.5 }],
        pointCount: 1,
        averageNdvi: 0.5,
        volatility: 0,
        recentDelta: 0,
      },
      {
        name: 'two equal points (flat series)',
        points: [{ ndvi: 0.5 }, { ndvi: 0.5 }],
        pointCount: 2,
        averageNdvi: 0.5,
        volatility: 0,
        recentDelta: 0,
      },
      {
        // mean 0.5; deviations ±0.1; variance 0.01; volatility 0.1; delta 0.2
        name: 'two-point series with delta',
        points: [{ ndvi: 0.4 }, { ndvi: 0.6 }],
        pointCount: 2,
        averageNdvi: 0.5,
        volatility: 0.1,
        recentDelta: 0.2,
      },
    ])(
      '$name',
      ({ points, pointCount, averageNdvi, volatility, recentDelta }) => {
        const result = computeNdviStats(points);
        expect(result.pointCount).toBe(pointCount);
        if (averageNdvi === null) {
          expect(result.averageNdvi).toBeNull();
        } else {
          expect(result.averageNdvi).toBeCloseTo(averageNdvi);
        }
        expect(result.volatility).toBeCloseTo(volatility);
        expect(result.recentDelta).toBeCloseTo(recentDelta);
      }
    );
  });

  describe('computeNdviDeltas', () => {
    const d = (s: string) => new Date(`${s}T00:00:00`);
    it.each<{
      name: string;
      points: { date: Date; ndvi: number }[];
      expected: number[];
    }>([
      { name: 'empty input', points: [], expected: [] },
      {
        name: 'single point (no pair)',
        points: [{ date: d('2024-01-01'), ndvi: 0.5 }],
        expected: [],
      },
      {
        name: 'two points',
        points: [
          { date: d('2024-01-01'), ndvi: 0.4 },
          { date: d('2025-01-01'), ndvi: 0.55 },
        ],
        expected: [0.15],
      },
      {
        name: 'three points (n-1 deltas)',
        points: [
          { date: d('2023-01-01'), ndvi: 0.4 },
          { date: d('2024-01-01'), ndvi: 0.5 },
          { date: d('2025-01-01'), ndvi: 0.45 },
        ],
        expected: [0.1, -0.05],
      },
    ])('$name', ({ points, expected }) => {
      const result = computeNdviDeltas(points);
      expect(result.map(r => r.delta)).toEqual(
        expected.map(v => expect.closeTo(v))
      );
      // Each delta is tagged with the latter point's date.
      if (result.length > 0) {
        expect(result[0]?.date.getTime()).toBe(points[1]!.date.getTime());
      }
    });
  });

  describe('findExtremeDeltas', () => {
    const mk = (delta: number): NdviDelta => ({
      date: new Date('2025-01-01T00:00:00'),
      delta,
    });

    it('returns both null for empty deltas', () => {
      expect(findExtremeDeltas([])).toEqual({
        sharpestDrop: null,
        strongestRecovery: null,
      });
    });

    it('returns the same point for a single delta', () => {
      const result = findExtremeDeltas([mk(0.1)]);
      expect(result.sharpestDrop?.delta).toBeCloseTo(0.1);
      expect(result.strongestRecovery?.delta).toBeCloseTo(0.1);
    });

    it('picks the most negative as sharpestDrop and most positive as strongestRecovery', () => {
      const result = findExtremeDeltas([mk(0.05), mk(-0.2), mk(0.1), mk(-0.05)]);
      expect(result.sharpestDrop?.delta).toBeCloseTo(-0.2);
      expect(result.strongestRecovery?.delta).toBeCloseTo(0.1);
    });

    it('handles an all-positive series (drop is the smallest positive)', () => {
      const result = findExtremeDeltas([mk(0.05), mk(0.2), mk(0.1)]);
      expect(result.sharpestDrop?.delta).toBeCloseTo(0.05);
      expect(result.strongestRecovery?.delta).toBeCloseTo(0.2);
    });
  });

  describe('derivePixelPercents', () => {
    it.each<{
      name: string;
      counts: HeatmapData['pixel_counts'] | undefined;
      stressed: number;
      moderate: number;
    }>([
      { name: 'undefined', counts: undefined, stressed: 0, moderate: 0 },
      {
        name: 'all zero',
        counts: { valid: 0, red: 0, yellow: 0, green: 0 },
        stressed: 0,
        moderate: 0,
      },
      {
        name: 'valid as denominator',
        counts: { valid: 200, red: 50, yellow: 30, green: 120 },
        stressed: 25,
        moderate: 15,
      },
      {
        name: 'falls back to red+yellow+green when valid is 0',
        counts: { valid: 0, red: 20, yellow: 30, green: 50 },
        stressed: 20,
        moderate: 30,
      },
      {
        name: 'all green → both zero',
        counts: { valid: 100, red: 0, yellow: 0, green: 100 },
        stressed: 0,
        moderate: 0,
      },
    ])('$name', ({ counts, stressed, moderate }) => {
      const result = derivePixelPercents(counts);
      expect(result.stressedPercent).toBeCloseTo(stressed);
      expect(result.moderatePercent).toBeCloseTo(moderate);
    });

    it('agrees with computeRiskScore on the same input', () => {
      const counts = { valid: 200, red: 50, yellow: 30, green: 120 };
      const { stressedPercent, moderatePercent } = derivePixelPercents(counts);
      const expected =
        Math.max(0, Math.min(100, stressedPercent * 0.7 + moderatePercent * 0.3));
      expect(computeRiskScore(counts)).toBeCloseTo(expected);
    });
  });

  describe('deriveTopIssue', () => {
    it.each<{
      name: string;
      stressed: number;
      moderate: number;
      expected: { name: string; priority: 'High' | 'Medium' | 'Low' } | null;
    }>([
      {
        name: 'low stress and low moderate → null',
        stressed: 3,
        moderate: 10,
        expected: null,
      },
      {
        name: 'stress 5-34 → Stressed area, Medium',
        stressed: 20,
        moderate: 0,
        expected: { name: 'Stressed area', priority: 'Medium' },
      },
      {
        name: 'stress ≥ 35 → Stressed area, High',
        stressed: 40,
        moderate: 0,
        expected: { name: 'Stressed area', priority: 'High' },
      },
      {
        name: 'low stress, moderate ≥ 20 → Moderate-health area, Medium',
        stressed: 2,
        moderate: 25,
        expected: { name: 'Moderate-health area', priority: 'Medium' },
      },
      {
        name: 'stress wins over moderate when both qualify',
        stressed: 10,
        moderate: 40,
        expected: { name: 'Stressed area', priority: 'Medium' },
      },
    ])('$name', ({ stressed, moderate, expected }) => {
      const result = deriveTopIssue(stressed, moderate);
      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result?.name).toBe(expected.name);
        expect(result?.priority).toBe(expected.priority);
      }
    });
  });

  describe('deriveHealthTag', () => {
    it.each<{ name: string; ndvi: number | undefined; expected: string }>([
      { name: 'undefined → Unknown', ndvi: undefined, expected: 'Unknown' },
      { name: 'NDVI 0.7 → Healthy', ndvi: 0.7, expected: 'Healthy' },
      { name: 'boundary 0.6 → Healthy', ndvi: 0.6, expected: 'Healthy' },
      { name: 'NDVI 0.5 → Moderate', ndvi: 0.5, expected: 'Moderate' },
      { name: 'boundary 0.4 → Moderate', ndvi: 0.4, expected: 'Moderate' },
      { name: 'NDVI 0.2 → Stressed', ndvi: 0.2, expected: 'Stressed' },
      { name: 'NDVI 0 → Stressed', ndvi: 0, expected: 'Stressed' },
    ])('$name', ({ ndvi, expected }) => {
      expect(deriveHealthTag(ndvi).label).toBe(expected);
    });
  });

  describe('deriveActionItems', () => {
    const stressedTopIssue: TopIssue = {
      name: 'Stressed area',
      affected_area_pct: 40,
      priority: 'High',
    };

    it.each<{
      name: string;
      trendKey: HealthTrend;
      hasHighStress: boolean;
      topIssue: TopIssue | null;
      irrigationTitle: string;
      irrigationPriority: 'High' | 'Medium' | 'Low';
      issueTitle: string;
    }>([
      {
        name: 'declining + no high stress + no topIssue',
        trendKey: 'declining',
        hasHighStress: false,
        topIssue: null,
        irrigationTitle: 'Irrigation Required',
        irrigationPriority: 'High',
        issueTitle: 'Nitrogen Boost',
      },
      {
        name: 'stable + high stress',
        trendKey: 'stable',
        hasHighStress: true,
        topIssue: null,
        irrigationTitle: 'Irrigation Required',
        irrigationPriority: 'High',
        issueTitle: 'Nitrogen Boost',
      },
      {
        name: 'improving + low stress (relaxed)',
        trendKey: 'improving',
        hasHighStress: false,
        topIssue: null,
        irrigationTitle: 'Irrigation Uniformity Check',
        irrigationPriority: 'Medium',
        issueTitle: 'Nitrogen Boost',
      },
      {
        name: 'with stressed topIssue → control action',
        trendKey: 'stable',
        hasHighStress: true,
        topIssue: stressedTopIssue,
        irrigationTitle: 'Irrigation Required',
        irrigationPriority: 'High',
        issueTitle: 'Stressed area Control',
      },
      {
        name: 'null trendKey behaves like non-declining',
        trendKey: null,
        hasHighStress: false,
        topIssue: null,
        irrigationTitle: 'Irrigation Uniformity Check',
        irrigationPriority: 'Medium',
        issueTitle: 'Nitrogen Boost',
      },
    ])(
      '$name',
      ({
        trendKey,
        hasHighStress,
        topIssue,
        irrigationTitle,
        irrigationPriority,
        issueTitle,
      }) => {
        const items = deriveActionItems({ trendKey, hasHighStress, topIssue });
        expect(items).toHaveLength(3);
        expect(items[0]?.title).toBe(irrigationTitle);
        expect(items[0]?.priority).toBe(irrigationPriority);
        expect(items[1]?.title).toBe(issueTitle);
      }
    );
  });

  describe('deriveInsightChips', () => {
    const drop = (d: number): NdviDelta => ({
      date: new Date('2025-01-01T00:00:00'),
      delta: d,
    });

    it.each<{
      name: string;
      trendKey: HealthTrend;
      sharpestDrop: NdviDelta | null;
      strongestRecovery: NdviDelta | null;
      volatility: number;
      expectedLabels: string[];
    }>([
      {
        name: 'no signals → Steady fallback',
        trendKey: 'stable',
        sharpestDrop: null,
        strongestRecovery: null,
        volatility: 0,
        expectedLabels: ['Steady Pattern'],
      },
      {
        name: 'improving → Stable Growth',
        trendKey: 'improving',
        sharpestDrop: null,
        strongestRecovery: null,
        volatility: 0,
        expectedLabels: ['Stable Growth'],
      },
      {
        name: 'sharp drop ≤ -0.03 → Sudden Drop',
        trendKey: 'stable',
        sharpestDrop: drop(-0.05),
        strongestRecovery: null,
        volatility: 0,
        expectedLabels: ['Sudden Drop Detected'],
      },
      {
        name: 'strong recovery ≥ 0.03 → Recovery Signal',
        trendKey: 'stable',
        sharpestDrop: null,
        strongestRecovery: drop(0.05),
        volatility: 0,
        expectedLabels: ['Recovery Signal'],
      },
      {
        name: 'volatility ≥ 0.04 → High Variability',
        trendKey: 'stable',
        sharpestDrop: null,
        strongestRecovery: null,
        volatility: 0.05,
        expectedLabels: ['High Variability'],
      },
      {
        name: 'volatility in (0, 0.02) → Consistent Canopy',
        trendKey: 'stable',
        sharpestDrop: null,
        strongestRecovery: null,
        volatility: 0.01,
        expectedLabels: ['Consistent Canopy'],
      },
      {
        name: 'multiple signals stack',
        trendKey: 'improving',
        sharpestDrop: drop(-0.05),
        strongestRecovery: drop(0.05),
        volatility: 0.05,
        expectedLabels: [
          'Stable Growth',
          'Sudden Drop Detected',
          'Recovery Signal',
          'High Variability',
        ],
      },
    ])(
      '$name',
      ({
        trendKey,
        sharpestDrop,
        strongestRecovery,
        volatility,
        expectedLabels,
      }) => {
        const chips = deriveInsightChips({
          trendKey,
          sharpestDrop,
          strongestRecovery,
          volatility,
        });
        expect(chips.map(c => c.label)).toEqual(expectedLabels);
      }
    );
  });

  describe('deriveTrendLabel', () => {
    it.each<{ name: string; trendKey: HealthTrend; expected: string }>([
      { name: 'improving', trendKey: 'improving', expected: 'Improving' },
      { name: 'stable', trendKey: 'stable', expected: 'Stable' },
      { name: 'declining', trendKey: 'declining', expected: 'Declining' },
      { name: 'null falls back to Stable', trendKey: null, expected: 'Stable' },
    ])('returns $expected for $name', ({ trendKey, expected }) => {
      expect(deriveTrendLabel(trendKey)).toBe(expected);
    });
  });

  describe('deriveTrendInsight', () => {
    it.each<{
      name: string;
      trendKey: HealthTrend;
      pointCount: number;
      expected: string;
    }>([
      {
        name: 'zero points → insufficient',
        trendKey: 'improving',
        pointCount: 0,
        expected: NDVI_PANEL_COPY.insufficientTrendInsight,
      },
      {
        name: 'one point → insufficient',
        trendKey: 'declining',
        pointCount: 1,
        expected: NDVI_PANEL_COPY.insufficientTrendInsight,
      },
      {
        name: 'two points + improving → improving insight',
        trendKey: 'improving',
        pointCount: 2,
        expected: NDVI_TREND_META.improving.insight,
      },
      {
        name: 'five points + declining → declining insight',
        trendKey: 'declining',
        pointCount: 5,
        expected: NDVI_TREND_META.declining.insight,
      },
      {
        name: 'null trend with enough data → stable insight',
        trendKey: null,
        pointCount: 3,
        expected: NDVI_TREND_META.stable.insight,
      },
    ])('$name', ({ trendKey, pointCount, expected }) => {
      expect(deriveTrendInsight(trendKey, pointCount)).toBe(expected);
    });
  });

  describe('deriveKeyIssueText', () => {
    const stressedTopIssue: TopIssue = {
      name: 'Stressed area',
      affected_area_pct: 22,
      priority: 'Medium',
    };

    it('uses the topIssue template when a top issue exists', () => {
      expect(deriveKeyIssueText(stressedTopIssue, 22)).toBe(
        NDVI_KEY_ISSUE_TEXT.topIssue(22, 'Stressed area')
      );
    });

    it('uses the high-stress template when stressed ≥ 40 and no top issue', () => {
      expect(deriveKeyIssueText(null, 45)).toBe(
        NDVI_KEY_ISSUE_TEXT.highStress(45)
      );
    });

    it('falls back to the no-stress sentence otherwise', () => {
      expect(deriveKeyIssueText(null, 10)).toBe(NDVI_KEY_ISSUE_TEXT.noStress);
    });

    it('topIssue wins even when stressed ≥ 40', () => {
      expect(deriveKeyIssueText(stressedTopIssue, 50)).toBe(
        NDVI_KEY_ISSUE_TEXT.topIssue(22, 'Stressed area')
      );
    });
  });

  describe('deriveMicroInsight', () => {
    const mkDelta = (delta: number, ymd: string): NdviDelta => ({
      date: new Date(`${ymd}T00:00:00`),
      delta,
    });

    it('returns the no-swings fallback when either extreme is null', () => {
      expect(deriveMicroInsight(null, null)).toBe(
        NDVI_MICRO_INSIGHT_TEXT.noSwings
      );
      expect(deriveMicroInsight(mkDelta(-0.1, '2025-01-01'), null)).toBe(
        NDVI_MICRO_INSIGHT_TEXT.noSwings
      );
    });

    it('returns the drop sentence when sharpestDrop ≤ -0.03', () => {
      const drop = mkDelta(-0.05, '2024-06-15');
      const recovery = mkDelta(0.01, '2025-01-01');
      const result = deriveMicroInsight(drop, recovery);
      expect(result).toMatch(/^Sharpest drop landed in/);
      expect(result).toContain('2024');
    });

    it('returns the recovery sentence when strongestRecovery ≥ 0.03', () => {
      const drop = mkDelta(-0.01, '2024-01-01');
      const recovery = mkDelta(0.07, '2025-06-15');
      const result = deriveMicroInsight(drop, recovery);
      expect(result).toMatch(/^Strongest recovery landed in/);
      expect(result).toContain('2025');
    });

    it('returns the no-swings fallback when both extremes are within ±0.03', () => {
      const drop = mkDelta(-0.01, '2024-01-01');
      const recovery = mkDelta(0.02, '2025-01-01');
      expect(deriveMicroInsight(drop, recovery)).toBe(
        NDVI_MICRO_INSIGHT_TEXT.noSwings
      );
    });
  });

  describe('deriveImpactText', () => {
    it.each<{
      name: string;
      trendKey: HealthTrend;
      stressed: number;
      expected: string;
    }>([
      {
        name: 'declining + stressed ≥ 40 → widespread',
        trendKey: 'declining',
        stressed: 50,
        expected: NDVI_IMPACT_TEXT.decliningWidespread,
      },
      {
        name: 'declining + stressed < 40 → declining',
        trendKey: 'declining',
        stressed: 20,
        expected: NDVI_IMPACT_TEXT.declining,
      },
      {
        name: 'improving → improving',
        trendKey: 'improving',
        stressed: 5,
        expected: NDVI_IMPACT_TEXT.improving,
      },
      {
        name: 'stable → stable',
        trendKey: 'stable',
        stressed: 5,
        expected: NDVI_IMPACT_TEXT.stable,
      },
      {
        name: 'null trend → stable fallback',
        trendKey: null,
        stressed: 5,
        expected: NDVI_IMPACT_TEXT.stable,
      },
    ])('$name', ({ trendKey, stressed, expected }) => {
      expect(deriveImpactText(trendKey, stressed)).toBe(expected);
    });
  });

  describe('deriveComparisonText', () => {
    const mkPoint = (year: number): NdviChartPoint => ({
      date: new Date(`${year}-01-01T00:00:00`),
      ndvi: 0.5,
      longLabel: '',
      axisLabel: String(year),
    });

    it('returns insufficient when yearsSpanned is 0', () => {
      expect(deriveComparisonText(0, [mkPoint(2025)])).toBe(
        NDVI_COMPARISON_TEXT.insufficient
      );
    });

    it('returns insufficient when chart data is empty', () => {
      expect(deriveComparisonText(2, [])).toBe(
        NDVI_COMPARISON_TEXT.insufficient
      );
    });

    it.each([
      { years: 1, expected: NDVI_COMPARISON_TEXT.withYears(1) },
      { years: 4, expected: NDVI_COMPARISON_TEXT.withYears(4) },
    ])('returns withYears($years) when endpoints exist', ({ years, expected }) => {
      const data = [mkPoint(2020), mkPoint(2024)];
      expect(deriveComparisonText(years, data)).toBe(expected);
    });
  });

  describe('deriveAiPriority', () => {
    it.each<{ score: number; expected: 'High' | 'Medium' | 'Low' }>([
      { score: 0, expected: 'High' },
      { score: 35, expected: 'High' },
      { score: 36, expected: 'Medium' },
      { score: 65, expected: 'Medium' },
      { score: 66, expected: 'Low' },
      { score: 100, expected: 'Low' },
    ])('returns $expected for cropHealthScore $score', ({ score, expected }) => {
      expect(deriveAiPriority(score)).toBe(expected);
    });
  });

  describe('deriveHealthColor', () => {
    it.each<{ score: number; expected: string }>([
      { score: 0, expected: 'bg-red-500' },
      { score: 39, expected: 'bg-red-500' },
      { score: 40, expected: 'bg-amber-500' },
      { score: 69, expected: 'bg-amber-500' },
      { score: 70, expected: 'bg-emerald-500' },
      { score: 100, expected: 'bg-emerald-500' },
    ])('returns $expected for cropHealthScore $score', ({ score, expected }) => {
      expect(deriveHealthColor(score)).toBe(expected);
    });
  });

  describe('formatYearSpanArrow', () => {
    const mkPoint = (year: number): NdviChartPoint => ({
      date: new Date(`${year}-01-01T00:00:00`),
      ndvi: 0.5,
      longLabel: '',
      axisLabel: String(year),
    });

    it.each<{
      name: string;
      data: NdviChartPoint[];
      expected: string;
    }>([
      {
        name: 'empty → same calendar window',
        data: [],
        expected: NDVI_PANEL_COPY.sameCalendarWindow,
      },
      {
        name: 'single point → same calendar window',
        data: [mkPoint(2025)],
        expected: NDVI_PANEL_COPY.sameCalendarWindow,
      },
      {
        name: 'same year endpoints → same calendar window',
        data: [mkPoint(2025), mkPoint(2025)],
        expected: NDVI_PANEL_COPY.sameCalendarWindow,
      },
      {
        name: 'multi-year span → arrow format',
        data: [mkPoint(2023), mkPoint(2024), mkPoint(2025)],
        expected: '2023 → 2025',
      },
    ])('$name', ({ data, expected }) => {
      expect(formatYearSpanArrow(data)).toBe(expected);
    });
  });

  describe('formatYearSpanPrefix', () => {
    const mkPoint = (year: number): NdviChartPoint => ({
      date: new Date(`${year}-01-01T00:00:00`),
      ndvi: 0.5,
      longLabel: '',
      axisLabel: String(year),
    });

    it.each<{
      name: string;
      data: NdviChartPoint[];
      expected: string;
    }>([
      {
        name: 'empty → across the available years',
        data: [],
        expected: NDVI_PANEL_COPY.acrossAvailableYears,
      },
      {
        name: 'single point → across the available years',
        data: [mkPoint(2025)],
        expected: NDVI_PANEL_COPY.acrossAvailableYears,
      },
      {
        name: 'multi-year span → from..to format',
        data: [mkPoint(2023), mkPoint(2025)],
        expected: NDVI_PANEL_COPY.fromYearToYear(2023, 2025),
      },
    ])('$name', ({ data, expected }) => {
      expect(formatYearSpanPrefix(data)).toBe(expected);
    });
  });

  describe('formatAnalysisDate', () => {
    it.each<{ name: string; input: string | undefined; expected: RegExp | null }>([
      { name: 'undefined', input: undefined, expected: null },
      { name: 'an empty string', input: '', expected: null },
      { name: 'an unparseable string', input: 'invalid', expected: null },
      { name: 'an out-of-range month', input: '2025-13-01', expected: null },
      { name: 'a valid date', input: '2025-09-15', expected: /Sep.*15.*2025/ },
      { name: 'a leap day', input: '2024-02-29', expected: /Feb.*29.*2024/ },
      { name: 'the first of January', input: '2025-01-01', expected: /Jan.*1.*2025/ },
      { name: 'the last of December', input: '2025-12-31', expected: /Dec.*31.*2025/ },
    ])('formats $name', ({ input, expected }) => {
      const result = formatAnalysisDate(input);
      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toMatch(expected);
      }
    });
  });
});
