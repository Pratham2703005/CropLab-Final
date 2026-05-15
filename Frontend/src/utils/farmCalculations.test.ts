import { describe, it, expect } from 'vitest';
import { calculateTotalArea, getActiveCropsCount } from './farmCalculations';
import type { Farm } from '@/types/farm';

describe('farmCalculations', () => {
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
});
