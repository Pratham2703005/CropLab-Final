import { describe, it, expect } from 'vitest';
import {
  deriveOverallHealth,
  computeRiskScore,
  computeHealthTrend,
  computeBandShares,
  bandsPlaceholder,
  formatAnalysisDate,
} from './sidebar';
import type { HealthLabel } from '@/types/sidebar';
import type { HeatmapData, MaskOverlay } from '@/types';
import { NDVI_MASK_SET, NDWI_MASK_SET } from '@/constants/map';

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
      direction: 'improving' | 'declining' | 'stable' | null;
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
        direction: 'improving',
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
        direction: 'declining',
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
        direction: 'stable',
        deltaPct: 2,
        priorYears: 1,
      },
      {
        name: 'unsorted input (sorted by date internally)',
        input: [
          { date: '2025-01-01', mean_ndvi: 0.5 },
          { date: '2024-01-01', mean_ndvi: 0.4 },
        ],
        direction: 'improving',
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
        direction: 'improving',
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
