import { describe, it, expect } from 'vitest';
import {
  calculateCropDates,
  monthNameToNumber,
  validateFarmDates,
  validateFarmForm,
} from './farm';

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
});
