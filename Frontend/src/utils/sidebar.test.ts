import { describe, it, expect } from 'vitest';
import {
  deriveOverallHealth,
  computeHealthTrend,
  computeBandShares,
  bandsPlaceholder,
  formatAnalysisDate,
} from './sidebar';
import type { HealthLabel } from '@/types/sidebar';
import { NDVI_MASK_SET, NDWI_MASK_SET } from '@/constants/map';

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
    ])(
      'returns $expected for $name',
      ({ riskScore, expected }) => {
        expect(deriveOverallHealth(riskScore)).toBe(expected);
      }
    );
  });

  describe('computeHealthTrend', () => {
    it('returns null direction and zeros when no data', () => {
      expect(computeHealthTrend(undefined)).toEqual({
        direction: null,
        deltaPct: 0,
        priorYearsCount: 0,
      });
    });

    it('returns null direction when only one data point', () => {
      expect(
        computeHealthTrend([{ date: '2025-01-01', mean_ndvi: 0.5 }])
      ).toEqual({
        direction: null,
        deltaPct: 0,
        priorYearsCount: 0,
      });
    });

    it('detects improving trend', () => {
      const result = computeHealthTrend([
        { date: '2024-01-01', mean_ndvi: 0.4 },
        { date: '2025-01-01', mean_ndvi: 0.5 },
      ]);
      expect(result.direction).toBe('improving');
      expect(result.deltaPct).toBeGreaterThan(0);
      expect(result.priorYearsCount).toBe(1);
    });

    it('detects declining trend', () => {
      const result = computeHealthTrend([
        { date: '2024-01-01', mean_ndvi: 0.6 },
        { date: '2025-01-01', mean_ndvi: 0.5 },
      ]);
      expect(result.direction).toBe('declining');
      expect(result.deltaPct).toBeLessThan(0);
      expect(result.priorYearsCount).toBe(1);
    });

    it('detects stable trend (delta < 3%)', () => {
      const result = computeHealthTrend([
        { date: '2024-01-01', mean_ndvi: 0.50 },
        { date: '2025-01-01', mean_ndvi: 0.51 },
      ]);
      expect(result.direction).toBe('stable');
      expect(Math.abs(result.deltaPct)).toBeLessThan(3);
    });

    it('ignores invalid NDVI values', () => {
      expect(
        computeHealthTrend([
          { date: '2024-01-01', mean_ndvi: NaN },
          { date: '2025-01-01', mean_ndvi: 0.5 },
        ])
      ).toEqual({
        direction: null,
        deltaPct: 0,
        priorYearsCount: 0,
      });
    });

    it('handles multiple prior years', () => {
      const result = computeHealthTrend([
        { date: '2023-01-01', mean_ndvi: 0.4 },
        { date: '2024-01-01', mean_ndvi: 0.45 },
        { date: '2025-01-01', mean_ndvi: 0.6 },
      ]);
      expect(result.priorYearsCount).toBe(2);
      expect(result.direction).toBe('improving');
    });
  });

  describe('computeBandShares', () => {
    it('returns null when counts undefined', () => {
      expect(computeBandShares(undefined, NDVI_MASK_SET)).toBeNull();
    });

    it('returns null when total is zero', () => {
      expect(computeBandShares({}, NDVI_MASK_SET)).toBeNull();
      expect(
        computeBandShares({ green: 0, yellow: 0, red: 0 }, NDVI_MASK_SET)
      ).toBeNull();
    });

    it('calculates correct percentages', () => {
      // NDVI_MASK_SET is ordered red, yellow, green.
      const shares = computeBandShares(
        { green: 50, yellow: 30, red: 20 },
        NDVI_MASK_SET
      );
      expect(shares).not.toBeNull();
      expect(shares![0]?.pct).toBeCloseTo(20);
      expect(shares![1]?.pct).toBeCloseTo(30);
      expect(shares![2]?.pct).toBeCloseTo(50);
    });

    it('handles missing keys gracefully', () => {
      const shares = computeBandShares({ green: 100 }, NDVI_MASK_SET);
      expect(shares).not.toBeNull();
      expect(shares![0]?.pct).toBeCloseTo(0);
      expect(shares![1]?.pct).toBeCloseTo(0);
      expect(shares![2]?.pct).toBeCloseTo(100);
    });

    it('works with different band specifications', () => {
      // NDWI_MASK_SET is ordered brown, yellow, light_blue.
      const shares = computeBandShares(
        { light_blue: 40, yellow: 35, brown: 25 },
        NDWI_MASK_SET
      );
      expect(shares?.length).toBe(3);
      expect(shares![0]?.spec.name).toBe('Very Low Water');
    });
  });

  describe('bandsPlaceholder', () => {
    it('returns NDVI bands for NDVI label', () => {
      const placeholder = bandsPlaceholder('Health (NDVI)');
      expect(placeholder.length).toBe(3);
      expect(placeholder[0]?.spec.id).toBe('red');
      expect(placeholder.every(b => b.pct === 0)).toBe(true);
    });

    it('returns NDWI bands for NDWI label', () => {
      const placeholder = bandsPlaceholder('Water (NDWI)');
      expect(placeholder.length).toBe(3);
      expect(placeholder[0]?.spec.id).toBe('brown');
    });

    it('returns NDRE bands for NDRE label', () => {
      const placeholder = bandsPlaceholder('Nutrition (NDRE)');
      expect(placeholder.length).toBe(4);
      expect(placeholder[0]?.spec.id).toBe('purple');
    });

    it('defaults to NDRE for unknown label', () => {
      const placeholder = bandsPlaceholder('Unknown');
      expect(placeholder.length).toBe(4);
      expect(placeholder[0]?.spec.id).toBe('purple');
    });
  });

  describe('formatAnalysisDate', () => {
    it('returns null for undefined', () => {
      expect(formatAnalysisDate(undefined)).toBeNull();
    });

    it('formats valid date correctly', () => {
      const result = formatAnalysisDate('2025-09-15');
      expect(result).toMatch(/Sep.*15.*2025/);
    });

    it('returns null for invalid date', () => {
      expect(formatAnalysisDate('invalid')).toBeNull();
      expect(formatAnalysisDate('2025-13-01')).toBeNull();
    });

    it('handles leap year dates', () => {
      expect(formatAnalysisDate('2024-02-29')).toMatch(/Feb.*29.*2024/);
    });

    it('formats different months correctly', () => {
      expect(formatAnalysisDate('2025-01-01')).toMatch(/Jan.*1.*2025/);
      expect(formatAnalysisDate('2025-12-31')).toMatch(/Dec.*31.*2025/);
    });
  });
});


