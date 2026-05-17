import { describe, it, expect } from 'vitest';
import { getPolygonCenter, toLeafletCoords, getZoomLevel } from './map';

describe('getPolygonCenter', () => {
  it.each([
    // Edge cases
    {
      input: [] as [number, number][],
      expected: [28.6139, 77.209] as [number, number],
      name: 'empty array',
    },

    // Basic cases
    {
      input: [[10, 20]] as [number, number][],
      expected: [10, 20] as [number, number],
      name: 'single point',
    },
    {
      input: [
        [10, 20],
        [30, 40],
      ] as [number, number][],
      expected: [20, 30] as [number, number],
      name: 'two points',
    },

    // Shapes
    {
      input: [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ] as [number, number][],
      expected: [5, 5] as [number, number],
      name: 'square',
    },
    {
      input: [
        [0, 0],
        [10, 0],
        [5, 10],
      ] as [number, number][],
      expected: [5, 10 / 3] as [number, number],
      name: 'triangle',
    },

    // Edge cases - coordinates
    {
      input: [
        [-10, -20],
        [10, 20],
      ] as [number, number][],
      expected: [0, 0] as [number, number],
      name: 'negative coordinates',
    },
    {
      input: [
        [75.7667, 30.8142],
        [77.7884, 27.2329],
      ] as [number, number][],
      expected: [76.77755, 29.02355] as [number, number],
      name: 'large real-world values',
    },
    {
      input: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [5, 5],
      ] as [number, number][],
      expected: [5, 5] as [number, number],
      name: 'complex polygon',
    },
  ])('$name: input=$input → output=$expected', ({ input, expected }) => {
    const result = getPolygonCenter(input);
    if (expected[0] > 100 || expected[1] > 100) {
      expect(result[0]).toBeCloseTo(expected[0], 4);
      expect(result[1]).toBeCloseTo(expected[1], 4);
    } else {
      expect(result).toEqual(expected);
    }
  });

  it('should not mutate input array (pure function)', () => {
    const coordinates: [number, number][] = [
      [10, 20],
      [30, 40],
    ];
    const copy = JSON.parse(JSON.stringify(coordinates));
    getPolygonCenter(coordinates);
    expect(coordinates).toEqual(copy);
  });
});

describe('toLeafletCoords', () => {
  it.each([
    // Edge cases
    {
      input: [] as number[][],
      expected: [] as [number, number][],
      name: 'empty array',
    },

    // Basic cases - [lng, lat] swapped to [lat, lng]
    {
      input: [[20, 10]] as number[][],
      expected: [[10, 20]] as [number, number][],
      name: 'single point swapped',
    },
    {
      input: [
        [77.209, 28.6139],
        [78.0, 29.0],
      ] as number[][],
      expected: [
        [28.6139, 77.209],
        [29.0, 78.0],
      ] as [number, number][],
      name: 'real-world lng/lat pairs',
    },
    {
      input: [
        [0, 0],
        [10, 0],
        [10, 10],
      ] as number[][],
      expected: [
        [0, 0],
        [0, 10],
        [10, 10],
      ] as [number, number][],
      name: 'triangle polygon',
    },

    // Edge cases - invalid entries filtered out
    {
      input: [[5]] as number[][],
      expected: [] as [number, number][],
      name: 'coordinate too short',
    },
    {
      input: [
        [1, 2],
        [3],
        [4, 5],
      ] as number[][],
      expected: [
        [2, 1],
        [5, 4],
      ] as [number, number][],
      name: 'mixed valid and short coordinates',
    },
    {
      input: [[1, 2, 3]] as number[][],
      expected: [[2, 1]] as [number, number][],
      name: 'extra values ignored, first two used',
    },
  ])('$name: input=$input → output=$expected', ({ input, expected }) => {
    expect(toLeafletCoords(input)).toEqual(expected);
  });

  it('filters out non-numeric and non-array entries', () => {
    const input = [
      [1, 2],
      ['a', 'b'],
      null,
      [3, 4],
    ] as unknown as number[][];
    expect(toLeafletCoords(input)).toEqual([
      [2, 1],
      [4, 3],
    ]);
  });

  it('returns an empty array for non-array input', () => {
    expect(toLeafletCoords(null as unknown as number[][])).toEqual([]);
    expect(toLeafletCoords(undefined as unknown as number[][])).toEqual([]);
  });

  it('should not mutate input array (pure function)', () => {
    const coordinates: number[][] = [
      [20, 10],
      [40, 30],
    ];
    const copy = JSON.parse(JSON.stringify(coordinates));
    toLeafletCoords(coordinates);
    expect(coordinates).toEqual(copy);
  });
});

describe('getZoomLevel', () => {
  it.each([
    // Edge cases
    {
      input: [] as [number, number][],
      expected: 10,
      name: 'empty array',
    },
    {
      input: [[28.6139, 77.209]] as [number, number][],
      expected: 14,
      name: 'single point (zero range)',
    },

    // Range buckets
    {
      input: [
        [0, 0],
        [2, 0],
      ] as [number, number][],
      expected: 8,
      name: 'large range > 1',
    },
    {
      input: [
        [0, 0],
        [0.5, 0],
      ] as [number, number][],
      expected: 10,
      name: 'medium range > 0.1',
    },
    {
      input: [
        [0, 0],
        [0.05, 0],
      ] as [number, number][],
      expected: 12,
      name: 'small range > 0.01',
    },
    {
      input: [
        [0, 0],
        [0.005, 0],
      ] as [number, number][],
      expected: 14,
      name: 'tiny range <= 0.01',
    },

    // lng range dominates
    {
      input: [
        [0, 0],
        [0, 3],
      ] as [number, number][],
      expected: 8,
      name: 'lng range dominates',
    },
  ])('$name: input=$input → output=$expected', ({ input, expected }) => {
    expect(getZoomLevel(input)).toBe(expected);
  });

  it('should not mutate input array (pure function)', () => {
    const coordinates: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const copy = JSON.parse(JSON.stringify(coordinates));
    getZoomLevel(coordinates);
    expect(coordinates).toEqual(copy);
  });
});
