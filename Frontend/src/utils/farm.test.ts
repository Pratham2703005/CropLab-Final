import { describe, it, expect } from 'vitest';
import {
  calculateCropDates,
  calculateTotalArea,
  getActiveCropsCount,
  monthNameToNumber,
  validateFarmDates,
  validateFarmForm,
  calculateFieldTimeline,
} from './farm';
import type { Farm } from '@/types';

describe('farm', () => {
  describe('validateFarmDates', () => {
    it.each([
      {
        name: 'empty planting date',
        planting: '',
        harvest: '2025-06-01',
        expected: 'Please select a planting date',
      },
      {
        name: 'undefined planting date',
        planting: undefined,
        harvest: '2025-06-01',
        expected: 'Please select a planting date',
      },
      {
        name: 'empty harvest date',
        planting: '2025-01-01',
        harvest: '',
        expected: 'Please select a harvest date',
      },
      {
        name: 'harvest before planting',
        planting: '2025-06-01',
        harvest: '2025-01-01',
        expected: 'Harvest date must be after planting date',
      },
      {
        name: 'harvest equal to planting',
        planting: '2025-06-01',
        harvest: '2025-06-01',
        expected: 'Harvest date must be after planting date',
      },
      {
        name: 'valid chronological range',
        planting: '2025-01-01',
        harvest: '2025-06-01',
        expected: null,
      },
    ])('returns $expected for $name', ({ planting, harvest, expected }) => {
      expect(validateFarmDates(planting, harvest)).toBe(expected);
    });
  });

  describe('validateFarmForm', () => {
    const validCoords: number[][] = [
      [77, 28],
      [77.1, 28],
      [77.1, 28.1],
      [77, 28],
    ];

    it.each([
      {
        name: 'missing planting date',
        input: {
          plantingDate: '',
          harvestDate: '2025-06-01',
          coordinates: validCoords,
        },
        expected: 'Please select a planting date',
      },
      {
        name: 'missing harvest date',
        input: {
          plantingDate: '2025-01-01',
          harvestDate: '',
          coordinates: validCoords,
        },
        expected: 'Please select a harvest date',
      },
      {
        name: 'harvest not after planting',
        input: {
          plantingDate: '2025-06-01',
          harvestDate: '2025-06-01',
          coordinates: validCoords,
        },
        expected: 'Harvest date must be after planting date',
      },
      {
        name: 'no boundary drawn',
        input: {
          plantingDate: '2025-01-01',
          harvestDate: '2025-06-01',
          coordinates: [],
        },
        expected: 'Please draw your farm boundary on the map',
      },
      {
        name: 'fully valid submission',
        input: {
          plantingDate: '2025-01-01',
          harvestDate: '2025-06-01',
          coordinates: validCoords,
        },
        expected: null,
      },
    ])('returns $expected for $name', ({ input, expected }) => {
      expect(validateFarmForm(input)).toBe(expected);
    });

    it('reports a date problem before a missing boundary', () => {
      // Both the dates and the boundary are invalid — the date error wins
      // because date checks run first.
      expect(
        validateFarmForm({
          plantingDate: '',
          harvestDate: '',
          coordinates: [],
        })
      ).toBe('Please select a planting date');
    });
  });

  describe('monthNameToNumber', () => {
    it.each([
      { name: 'January', month: 'Jan', expected: 1 },
      { name: 'June', month: 'Jun', expected: 6 },
      { name: 'December', month: 'Dec', expected: 12 },
      { name: 'an unknown name (falls back to 1)', month: 'Xyz', expected: 1 },
      { name: 'an empty string (falls back to 1)', month: '', expected: 1 },
    ])('returns $expected for $name', ({ month, expected }) => {
      expect(monthNameToNumber(month)).toBe(expected);
    });
  });

  describe('calculateCropDates', () => {
    // Fixed reference date (15 Aug 2025) keeps the calculation deterministic.
    const refDate = new Date(2025, 7, 15);

    it.each([
      {
        // Wheat is sown Oct-Dec — later than the Aug reference month — so the
        // planting year rolls back a year and harvest lands the next spring.
        name: 'a crop sown after the reference month (planting year rolls back)',
        crop: 'Wheat',
        expected: { plantingDate: '2024-10-01', harvestDate: '2025-03-01' },
      },
      {
        // Rice is sown Jun-Jul — before the Aug reference month — so planting
        // stays in the current year and harvest follows the same year.
        name: 'a crop sown before the reference month (same year)',
        crop: 'Rice',
        expected: { plantingDate: '2025-06-01', harvestDate: '2025-10-01' },
      },
    ])('computes dates for $name', ({ crop, expected }) => {
      expect(calculateCropDates(crop, refDate)).toEqual(expected);
    });

    it('returns empty dates for an unknown crop', () => {
      expect(calculateCropDates('Dragonfruit', refDate)).toEqual({
        plantingDate: '',
        harvestDate: '',
      });
    });
  });

  describe('calculateTotalArea', () => {
    it.each([
      {
        name: 'empty array',
        farms: [],
        expected: 0,
      },
      {
        name: 'single farm',
        farms: [{ id: '1', name: 'Farm 1', area: 10, crop: 'wheat' } as Farm],
        expected: 10,
      },
      {
        name: 'multiple farms',
        farms: [
          { id: '1', name: 'Farm 1', area: 10, crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', area: 20, crop: 'rice' } as Farm,
          { id: '3', name: 'Farm 3', area: 15, crop: 'corn' } as Farm,
        ],
        expected: 45,
      },
      {
        name: 'farms with missing area (treat as 0)',
        farms: [
          { id: '1', name: 'Farm 1', area: 10, crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', crop: 'rice' } as Farm,
          { id: '3', name: 'Farm 3', area: 20, crop: 'corn' } as Farm,
        ],
        expected: 30,
      },
      {
        name: 'all farms with zero area',
        farms: [
          { id: '1', name: 'Farm 1', area: 0, crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', area: 0, crop: 'rice' } as Farm,
        ],
        expected: 0,
      },
      {
        name: 'mixed zero and positive areas',
        farms: [
          { id: '1', name: 'Farm 1', area: 0, crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', area: 50, crop: 'rice' } as Farm,
        ],
        expected: 50,
      },
    ])('should return $expected for $name', ({ farms, expected }) => {
      expect(calculateTotalArea(farms)).toBe(expected);
    });
  });

  describe('getActiveCropsCount', () => {
    it.each([
      {
        name: 'empty array',
        farms: [],
        expected: 0,
      },
      {
        name: 'single farm',
        farms: [{ id: '1', name: 'Farm 1', crop: 'wheat' } as Farm],
        expected: 1,
      },
      {
        name: 'all unique crops',
        farms: [
          { id: '1', name: 'Farm 1', crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', crop: 'rice' } as Farm,
          { id: '3', name: 'Farm 3', crop: 'corn' } as Farm,
        ],
        expected: 3,
      },
      {
        name: 'duplicate crops',
        farms: [
          { id: '1', name: 'Farm 1', crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', crop: 'rice' } as Farm,
          { id: '3', name: 'Farm 3', crop: 'wheat' } as Farm,
        ],
        expected: 2,
      },
      {
        name: 'all same crops',
        farms: [
          { id: '1', name: 'Farm 1', crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', crop: 'wheat' } as Farm,
          { id: '3', name: 'Farm 3', crop: 'wheat' } as Farm,
        ],
        expected: 1,
      },
      {
        name: 'many duplicates with few unique',
        farms: [
          { id: '1', name: 'Farm 1', crop: 'wheat' } as Farm,
          { id: '2', name: 'Farm 2', crop: 'wheat' } as Farm,
          { id: '3', name: 'Farm 3', crop: 'rice' } as Farm,
          { id: '4', name: 'Farm 4', crop: 'rice' } as Farm,
        ],
        expected: 2,
      },
    ])('should return $expected for $name', ({ farms, expected }) => {
      expect(getActiveCropsCount(farms)).toBe(expected);
    });
  });

  describe('calculateFieldTimeline', () => {
    const refDate = new Date(2025, 4, 15); // 15 May 2025

    it('calculates planned stage (before planting)', () => {
      const result = calculateFieldTimeline(
        '2025-06-01',
        '2025-09-01',
        refDate
      );
      expect(result.cropStage).toBe('Planned');
      expect(result.daysSincePlanting).toBe(0);
      expect(result.isCycleCompleted).toBe(false);
    });

    it('calculates growing stage (after planting, before 90%)', () => {
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-09-01',
        refDate
      );
      expect(result.cropStage).toBe('Growing');
      expect(result.daysSincePlanting).toBeGreaterThan(0);
      expect(result.cycleProgress).toBeLessThan(90);
      expect(result.isCycleCompleted).toBe(false);
    });

    it('calculates harvest window stage (at 90%+ progress)', () => {
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-05-25',
        refDate
      );
      expect(result.cropStage).toBe('Harvest Window');
      expect(result.cycleProgress).toBeGreaterThanOrEqual(90);
      expect(result.isCycleCompleted).toBe(false);
    });

    it('calculates completed stage (after harvest)', () => {
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-05-01',
        refDate
      );
      expect(result.cropStage).toBe('Completed');
      expect(result.daysRemaining).toBe(0);
      expect(result.isCycleCompleted).toBe(true);
    });

    it('calculates correct progress percentage', () => {
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-12-31',
        refDate
      );
      // 135 days elapsed / 364 days total ≈ 37%
      expect(result.cycleProgress).toBeGreaterThan(35);
      expect(result.cycleProgress).toBeLessThan(40);
    });

    it('accepts Date objects as inputs', () => {
      const plantDate = new Date(2025, 0, 1); // 1 Jan 2025
      const harvestDate = new Date(2025, 8, 1); // 1 Sep 2025
      const result = calculateFieldTimeline(plantDate, harvestDate, refDate);
      expect(result.totalCycleDays).toBeGreaterThan(0);
      expect(result.cropStage).toBe('Growing');
    });

    it('accepts ISO date strings as inputs', () => {
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-09-01',
        refDate
      );
      expect(result.totalCycleDays).toBeGreaterThan(0);
      expect(result.cropStage).toBe('Growing');
    });

    it('defaults to current date when referenceDate not provided', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 180); // 6 months in future
      const result = calculateFieldTimeline(
        futureDate.toISOString().split('T')[0]!,
        new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]!
      );
      expect(result.cropStage).toBe('Planned');
    });

    it('handles zero-day cycles (same planting/harvest + 1ms)', () => {
      const result = calculateFieldTimeline(
        '2025-05-15',
        '2025-05-16',
        refDate
      );
      expect(result.totalCycleDays).toBeGreaterThanOrEqual(1);
      expect(result.isCycleCompleted).toBe(false);
    });

    it('clamps cycleProgress between 0 and 100', () => {
      // Before planting
      const beforeResult = calculateFieldTimeline(
        '2025-12-01',
        '2025-12-02',
        refDate
      );
      expect(beforeResult.cycleProgress).toBeGreaterThanOrEqual(0);

      // After harvest
      const afterResult = calculateFieldTimeline(
        '2024-01-01',
        '2024-02-01',
        refDate
      );
      expect(afterResult.cycleProgress).toBeLessThanOrEqual(100);
    });

    it('calculates accurate daysRemaining at milestone dates', () => {
      // On Aug 2, 2025 with harvest on Sep 1, 2025 = 30 days (or 31 with ceiling)
      const testDate = new Date(2025, 7, 2); // 2 Aug 2025
      const result = calculateFieldTimeline(
        '2025-01-01',
        '2025-09-01',
        testDate
      );
      // With ceiling, the actual difference can be 30 or 31 depending on timing
      expect(result.daysRemaining).toBeGreaterThanOrEqual(29);
      expect(result.daysRemaining).toBeLessThanOrEqual(31);
    });
  })
});
