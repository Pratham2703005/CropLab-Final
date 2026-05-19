import { describe, it, expect } from 'vitest';
import { validateFarmDates, validateFarmForm } from './farm';

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
});
