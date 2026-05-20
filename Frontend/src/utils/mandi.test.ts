import { describe, it, expect } from 'vitest';
import {
  parsePriceKey,
  formatPriceKey,
  extractDistricts,
  resolveInitialDistrict,
  buildChartData,
} from './mandi';
import type { ChartPoint } from './mandi';
import type { AgmarknetData, Unit } from '@/types';

type Row = Record<string, string | number | null>;

describe('mandi', () => {
  describe('parsePriceKey', () => {
    it.each<{ name: string; key: string; expected: [number, number] }>([
      { name: 'standard key', key: 'prices_january_2025', expected: [2025, 1] },
      { name: 'february', key: 'prices_february_2024', expected: [2024, 2] },
      { name: 'december', key: 'prices_december_2023', expected: [2023, 12] },
      {
        name: 'uppercase month',
        key: 'prices_JANUARY_2025',
        expected: [2025, 1],
      },
      {
        name: 'unknown month (falls back to 0)',
        key: 'prices_xyz_2025',
        expected: [2025, 0],
      },
      {
        name: 'malformed key (NaN year, 0 month)',
        key: 'prices_',
        expected: [NaN, 0],
      },
    ])('returns $expected for $name', ({ key, expected }) => {
      expect(parsePriceKey(key)).toEqual(expected);
    });
  });

  describe('formatPriceKey', () => {
    it.each<{ name: string; key: string; expected: string }>([
      {
        name: 'standard key',
        key: 'prices_january_2025',
        expected: 'Jan 25',
      },
      { name: 'february', key: 'prices_february_2024', expected: 'Feb 24' },
      {
        name: 'uppercase month',
        key: 'prices_DECEMBER_2099',
        expected: 'Dec 99',
      },
    ])('returns $expected for $name', ({ key, expected }) => {
      expect(formatPriceKey(key)).toBe(expected);
    });
  });

  describe('extractDistricts', () => {
    it.each<{
      name: string;
      rows: AgmarknetData['rows'] | undefined;
      expected: string[];
    }>([
      { name: 'undefined rows', rows: undefined, expected: [] },
      { name: 'empty array', rows: [], expected: [] },
      {
        name: 'sorted unique strings',
        rows: [
          { district: 'Mumbai' },
          { district: 'Bengaluru' },
          { district: 'Pune' },
        ],
        expected: ['Bengaluru', 'Mumbai', 'Pune'],
      },
      {
        name: 'duplicates deduped with whitespace trimming',
        rows: [
          { district: '  Mumbai  ' },
          { district: 'Mumbai' },
          { district: 'Pune' },
        ],
        expected: ['Mumbai', 'Pune'],
      },
      {
        name: 'non-string and whitespace-only entries excluded',
        rows: [
          { district: 'Mumbai' },
          { district: 123 },
          { district: null },
          { district: '   ' },
          { district: 'Pune' },
        ],
        expected: ['Mumbai', 'Pune'],
      },
    ])('returns $expected for $name', ({ rows, expected }) => {
      expect(extractDistricts(rows)).toEqual(expected);
    });
  });

  describe('resolveInitialDistrict', () => {
    it.each<{
      name: string;
      districts: string[];
      detected: string | undefined;
      expected: string | undefined;
    }>([
      {
        name: 'empty districts',
        districts: [],
        detected: 'Mumbai',
        expected: undefined,
      },
      {
        name: 'no detected hint (falls back to first)',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: undefined,
        expected: 'Bengaluru',
      },
      {
        name: 'exact match',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: 'Mumbai',
        expected: 'Mumbai',
      },
      {
        name: 'case-insensitive match (returns original casing)',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: 'mumbai',
        expected: 'Mumbai',
      },
      {
        name: 'whitespace around detected (trimmed before match)',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: '  Mumbai  ',
        expected: 'Mumbai',
      },
      {
        name: 'no match (falls back to first)',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: 'Delhi',
        expected: 'Bengaluru',
      },
      {
        name: 'empty detected (falls back to first)',
        districts: ['Bengaluru', 'Mumbai', 'Pune'],
        detected: '',
        expected: 'Bengaluru',
      },
    ])('returns $expected for $name', ({ districts, detected, expected }) => {
      expect(resolveInitialDistrict(districts, detected)).toBe(expected);
    });
  });

  describe('buildChartData', () => {
    it.each<{
      name: string;
      districtRow: Row;
      stateAvg: Row | undefined;
      unit: Unit;
      expected: ChartPoint[];
    }>([
      {
        name: 'no price keys',
        districtRow: { district: 'X' },
        stateAvg: undefined,
        unit: 'quintal',
        expected: [],
      },
      {
        name: 'all district prices null',
        districtRow: {
          prices_january_2025: null,
          prices_february_2025: null,
        },
        stateAvg: undefined,
        unit: 'quintal',
        expected: [],
      },
      {
        name: 'quintal unit preserves values',
        districtRow: { prices_january_2025: 1500 },
        stateAvg: undefined,
        unit: 'quintal',
        expected: [
          {
            month: 'Jan 25',
            key: 'prices_january_2025',
            district: 1500,
            stateAverage: null,
          },
        ],
      },
      {
        name: 'kg unit divides by 100',
        districtRow: { prices_january_2025: 1500 },
        stateAvg: undefined,
        unit: 'kg',
        expected: [
          {
            month: 'Jan 25',
            key: 'prices_january_2025',
            district: 15,
            stateAverage: null,
          },
        ],
      },
      {
        name: 'sorted by year then month',
        districtRow: {
          prices_march_2025: 1300,
          prices_january_2025: 1100,
          prices_february_2024: 900,
        },
        stateAvg: undefined,
        unit: 'quintal',
        expected: [
          {
            month: 'Feb 24',
            key: 'prices_february_2024',
            district: 900,
            stateAverage: null,
          },
          {
            month: 'Jan 25',
            key: 'prices_january_2025',
            district: 1100,
            stateAverage: null,
          },
          {
            month: 'Mar 25',
            key: 'prices_march_2025',
            district: 1300,
            stateAverage: null,
          },
        ],
      },
      {
        name: 'fills stateAverage when numeric',
        districtRow: { prices_january_2025: 1500 },
        stateAvg: { prices_january_2025: 1400 },
        unit: 'quintal',
        expected: [
          {
            month: 'Jan 25',
            key: 'prices_january_2025',
            district: 1500,
            stateAverage: 1400,
          },
        ],
      },
      {
        name: 'leaves stateAverage null when non-numeric',
        districtRow: { prices_january_2025: 1500 },
        stateAvg: { prices_january_2025: 'N/A' },
        unit: 'quintal',
        expected: [
          {
            month: 'Jan 25',
            key: 'prices_january_2025',
            district: 1500,
            stateAverage: null,
          },
        ],
      },
      {
        name: 'drops months with non-numeric district price',
        districtRow: {
          prices_january_2025: 'N/A',
          prices_february_2025: 1200,
        },
        stateAvg: undefined,
        unit: 'quintal',
        expected: [
          {
            month: 'Feb 25',
            key: 'prices_february_2025',
            district: 1200,
            stateAverage: null,
          },
        ],
      },
    ])('$name', ({ districtRow, stateAvg, unit, expected }) => {
      expect(buildChartData(districtRow, stateAvg, unit)).toEqual(expected);
    });
  });
});
