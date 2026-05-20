import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  weatherEmoji,
  weatherLabel,
  getRainInfo,
  conditionGradient,
  getSuitability,
  toDateStr,
  addDaysStr,
  buildMonthGrid,
  getRiskTone,
  computeWeekSummary,
  getWeeklyAlert,
  computeMonthStats,
  computeWeatherCoverage,
  pickForecastStrip,
  buildWeatherIntelligenceData,
  classifyHeat,
  classifyRain,
  classifyWind,
  classifySpray,
  getInsightAdvice,
  getPrevMonth,
  getNextMonth,
  parseYearMonth,
  canNavigateToPrev,
  canNavigateToNext,
  todayInRangeStr,
} from './weather';
import {
  ACTIVE_INSIGHTS_KEYS,
  DAY_AVAILABILITY,
  INSIGHT_ADVICE,
  PRIORITY,
  SPRAY_CONDITION,
  SUITABILITY_LABEL,
  WEEKLY_SUMMARY_ALERTS,
} from '@/constants';
import type {
  ActiveInsightsKey,
  DayWeather,
  Priority,
  SprayCondition,
  WeekSummary,
  YearMonth,
} from '@/types';

const mkDay = (overrides: Partial<DayWeather> = {}): DayWeather => ({
  date: '2025-06-15',
  weatherCode: 0,
  tempMax: 25,
  tempMin: 18,
  precipitationSum: 0,
  precipitationProbability: 0,
  windSpeedMax: 10,
  uvIndexMax: 5,
  availability: DAY_AVAILABILITY.HISTORICAL,
  ...overrides,
});

const mkSummary = (overrides: Partial<WeekSummary> = {}): WeekSummary => ({
  avgTemp: 25,
  totalRain: 10,
  avgWind: 10,
  riskLevel: PRIORITY.LOW,
  ...overrides,
});

describe('weather utils', () => {
  describe('weatherEmoji', () => {
    it.each<{ name: string; code: number; expected: string }>([
      { name: 'no data', code: -1, expected: '?' },
      { name: 'clear sky', code: 0, expected: '☀️' },
      { name: 'partly cloudy', code: 2, expected: '⛅' },
      { name: 'overcast', code: 3, expected: '☁️' },
      { name: 'foggy', code: 48, expected: '🌫️' },
      { name: 'drizzle', code: 55, expected: '🌦️' },
      { name: 'rain', code: 65, expected: '🌧️' },
      { name: 'freezing rain', code: 67, expected: '🌨️' },
      { name: 'snow', code: 77, expected: '❄️' },
      { name: 'rain showers', code: 82, expected: '🌦️' },
      { name: 'snow showers', code: 86, expected: '❄️' },
      { name: 'thunderstorm', code: 95, expected: '⛈️' },
    ])('returns $expected for $name', ({ code, expected }) => {
      expect(weatherEmoji(code)).toBe(expected);
    });
  });

  describe('weatherLabel', () => {
    it.each<{ name: string; code: number; expected: string }>([
      { name: 'no data', code: -1, expected: 'No data yet' },
      { name: 'clear sky', code: 0, expected: 'Clear Sky' },
      { name: 'partly cloudy', code: 2, expected: 'Partly Cloudy' },
      { name: 'overcast', code: 3, expected: 'Overcast' },
      { name: 'foggy', code: 48, expected: 'Foggy' },
      { name: 'drizzle', code: 55, expected: 'Drizzle' },
      { name: 'rain', code: 65, expected: 'Rain' },
      { name: 'freezing rain', code: 67, expected: 'Freezing Rain' },
      { name: 'snow', code: 77, expected: 'Snow' },
      { name: 'rain showers', code: 82, expected: 'Rain Showers' },
      { name: 'snow showers', code: 86, expected: 'Snow Showers' },
      { name: 'thunderstorm', code: 95, expected: 'Thunderstorm' },
    ])('returns $expected for $name', ({ code, expected }) => {
      expect(weatherLabel(code)).toBe(expected);
    });
  });

  describe('getRainInfo', () => {
    it.each<{
      name: string;
      precipMm: number;
      precipProb: number | null;
      expected: string;
    }>([
      { name: 'heavy by volume', precipMm: 21, precipProb: 0, expected: 'Heavy Rain' },
      { name: 'moderate by volume', precipMm: 9, precipProb: 0, expected: 'Moderate Rain' },
      { name: 'light by volume', precipMm: 2, precipProb: 0, expected: 'Light Rain' },
      { name: 'moderate by probability', precipMm: 0, precipProb: 70, expected: 'Moderate Rain' },
      { name: 'light by probability', precipMm: 0, precipProb: 40, expected: 'Light Rain' },
      { name: 'dry day', precipMm: 0, precipProb: 0, expected: 'Dry Day' },
      { name: 'null probability', precipMm: 0, precipProb: null, expected: 'Dry Day' },
    ])('returns $expected for $name', ({ precipMm, precipProb, expected }) => {
      expect(getRainInfo(precipMm, precipProb).label).toBe(expected);
    });
  });

  describe('conditionGradient', () => {
    it.each<{ name: string; code: number; expected: string }>([
      { name: 'clear sky', code: 0, expected: 'from-amber-400 to-orange-500' },
      { name: 'partly cloudy', code: 2, expected: 'from-sky-400 to-blue-500' },
      { name: 'overcast', code: 3, expected: 'from-slate-400 to-slate-500' },
      { name: 'foggy', code: 48, expected: 'from-slate-300 to-slate-400' },
      { name: 'rain', code: 65, expected: 'from-blue-500 to-indigo-600' },
      { name: 'snow', code: 77, expected: 'from-slate-300 to-blue-300' },
      { name: 'thunderstorm', code: 95, expected: 'from-slate-600 to-slate-800' },
    ])('returns $expected for $name', ({ code, expected }) => {
      expect(conditionGradient(code)).toBe(expected);
    });
  });

  describe('getSuitability', () => {
    it.each<{ name: string; day: DayWeather; expected: string }>([
      { name: 'unavailable', day: mkDay({ availability: DAY_AVAILABILITY.UNAVAILABLE }), expected: SUITABILITY_LABEL.NONE },
      { name: 'thunderstorm', day: mkDay({ weatherCode: 95 }), expected: SUITABILITY_LABEL.NOT_SUITABLE },
      { name: 'rain code triggers poor', day: mkDay({ weatherCode: 61 }), expected: SUITABILITY_LABEL.POOR },
      { name: 'heavy precip triggers poor', day: mkDay({ precipitationSum: 6 }), expected: SUITABILITY_LABEL.POOR },
      { name: 'high wind triggers caution', day: mkDay({ weatherCode: 50, windSpeedMax: 36 }), expected: SUITABILITY_LABEL.CAUTION },
      { name: 'clear sky excellent', day: mkDay({ weatherCode: 0 }), expected: SUITABILITY_LABEL.EXCELLENT },
      { name: 'mid-range good', day: mkDay({ weatherCode: 50 }), expected: SUITABILITY_LABEL.GOOD },
    ])('returns $expected for $name', ({ day, expected }) => {
      expect(getSuitability(day).label).toBe(expected);
    });
  });

  describe('toDateStr', () => {
    it.each<{ name: string; date: Date; expected: string }>([
      { name: 'single-digit month and day', date: new Date(2025, 0, 5), expected: '2025-01-05' },
      { name: 'double-digit month and day', date: new Date(2025, 11, 25), expected: '2025-12-25' },
      { name: 'leap-day', date: new Date(2024, 1, 29), expected: '2024-02-29' },
    ])('returns $expected for $name', ({ date, expected }) => {
      expect(toDateStr(date)).toBe(expected);
    });
  });

  describe('addDaysStr', () => {
    it.each<{ name: string; dateStr: string; n: number; expected: string }>([
      { name: 'zero days', dateStr: '2025-06-15', n: 0, expected: '2025-06-15' },
      { name: 'plus 3 days', dateStr: '2025-06-15', n: 3, expected: '2025-06-18' },
      { name: 'minus 3 days', dateStr: '2025-06-15', n: -3, expected: '2025-06-12' },
      { name: 'cross month forward', dateStr: '2025-06-30', n: 1, expected: '2025-07-01' },
      { name: 'cross month backward', dateStr: '2025-06-01', n: -1, expected: '2025-05-31' },
      { name: 'cross year forward', dateStr: '2025-12-31', n: 1, expected: '2026-01-01' },
    ])('returns $expected for $name', ({ dateStr, n, expected }) => {
      expect(addDaysStr(dateStr, n)).toBe(expected);
    });
  });

  describe('buildMonthGrid', () => {
    it.each<{
      name: string;
      year: number;
      month: number;
      expectedRows: number;
      expectedLeadingNulls: number;
      expectedFirstDate: string;
      expectedDayCount: number;
    }>([
      // June 2025 starts Sunday -> Mon-anchored grid has 6 leading nulls, 30 days
      { name: 'June 2025 (starts Sunday)', year: 2025, month: 5, expectedRows: 6, expectedLeadingNulls: 6, expectedFirstDate: '2025-06-01', expectedDayCount: 30 },
      // February 2025 starts Saturday -> 5 leading nulls, 28 days
      { name: 'February 2025 (starts Saturday)', year: 2025, month: 1, expectedRows: 5, expectedLeadingNulls: 5, expectedFirstDate: '2025-02-01', expectedDayCount: 28 },
      // February 2024 (leap) starts Thursday -> 3 leading nulls, 29 days
      { name: 'February 2024 (leap year)', year: 2024, month: 1, expectedRows: 5, expectedLeadingNulls: 3, expectedFirstDate: '2024-02-01', expectedDayCount: 29 },
    ])(
      'builds correct shape for $name',
      ({ year, month, expectedRows, expectedLeadingNulls, expectedFirstDate, expectedDayCount }) => {
        const grid = buildMonthGrid(year, month);
        const flat = grid.flat();
        const realDates = flat.filter((c): c is string => c !== null);
        expect(grid.length).toBe(expectedRows);
        expect(flat.findIndex(c => c !== null)).toBe(expectedLeadingNulls);
        expect(realDates[0]).toBe(expectedFirstDate);
        expect(realDates.length).toBe(expectedDayCount);
        expect(grid.every(row => row.length === 7)).toBe(true);
      }
    );
  });

  describe('getRiskTone', () => {
    it.each<{ name: string; day: DayWeather; expected: Priority }>([
      { name: 'unavailable defaults low', day: mkDay({ availability: DAY_AVAILABILITY.UNAVAILABLE, tempMax: 99 }), expected: PRIORITY.LOW },
      { name: 'high heat triggers high', day: mkDay({ tempMax: 38 }), expected: PRIORITY.HIGH },
      { name: 'heavy rain triggers high', day: mkDay({ precipitationSum: 20 }), expected: PRIORITY.HIGH },
      { name: 'strong wind triggers high', day: mkDay({ windSpeedMax: 45 }), expected: PRIORITY.HIGH },
      { name: 'moderate temp', day: mkDay({ tempMax: 33 }), expected: PRIORITY.MEDIUM },
      { name: 'moderate rain', day: mkDay({ precipitationSum: 8 }), expected: PRIORITY.MEDIUM },
      { name: 'moderate wind', day: mkDay({ windSpeedMax: 30 }), expected: PRIORITY.MEDIUM },
      { name: 'calm conditions', day: mkDay(), expected: PRIORITY.LOW },
    ])('returns $expected for $name', ({ day, expected }) => {
      expect(getRiskTone(day)).toBe(expected);
    });
  });

  describe('computeWeekSummary', () => {
    it.each<{ name: string; recentWeek: DayWeather[]; expected: WeekSummary }>([
      {
        name: 'empty week',
        recentWeek: [],
        expected: { avgTemp: 0, totalRain: 0, avgWind: 0, riskLevel: PRIORITY.LOW },
      },
      {
        name: 'calm week is low risk',
        recentWeek: [mkDay({ tempMax: 26, tempMin: 18, precipitationSum: 0, windSpeedMax: 10 })],
        expected: { avgTemp: 22, totalRain: 0, avgWind: 10, riskLevel: PRIORITY.LOW },
      },
      {
        name: 'one risk factor is medium',
        recentWeek: [mkDay({ tempMax: 40, tempMin: 30, precipitationSum: 0, windSpeedMax: 10 })],
        expected: { avgTemp: 35, totalRain: 0, avgWind: 10, riskLevel: PRIORITY.MEDIUM },
      },
      {
        name: 'two risk factors is high',
        recentWeek: [mkDay({ tempMax: 40, tempMin: 30, precipitationSum: 70, windSpeedMax: 10 })],
        expected: { avgTemp: 35, totalRain: 70, avgWind: 10, riskLevel: PRIORITY.HIGH },
      },
    ])('returns $expected.riskLevel for $name', ({ recentWeek, expected }) => {
      expect(computeWeekSummary(recentWeek)).toEqual(expected);
    });
  });

  describe('getWeeklyAlert', () => {
    it.each<{ name: string; recentWeek: DayWeather[]; expected: string | null }>([
      { name: 'calm week', recentWeek: [mkDay()], expected: null },
      { name: 'heat-wave day', recentWeek: [mkDay({ tempMax: 40 })], expected: WEEKLY_SUMMARY_ALERTS.HIGH_TEMPERATURE },
      { name: 'heavy rain day', recentWeek: [mkDay({ precipitationSum: 30 })], expected: WEEKLY_SUMMARY_ALERTS.HEAVY_RAINFALL },
      { name: 'high wind day', recentWeek: [mkDay({ windSpeedMax: 45 })], expected: WEEKLY_SUMMARY_ALERTS.HIGH_WINDS },
      { name: 'heat trumps rain', recentWeek: [mkDay({ tempMax: 40, precipitationSum: 30 })], expected: WEEKLY_SUMMARY_ALERTS.HIGH_TEMPERATURE },
    ])('returns $expected for $name', ({ recentWeek, expected }) => {
      expect(getWeeklyAlert(recentWeek)).toBe(expected);
    });
  });

  describe('computeMonthStats', () => {
    it.each<{
      name: string;
      days: Record<string, DayWeather>;
      viewYear: number;
      viewMonth: number;
      expected: ReturnType<typeof computeMonthStats>;
    }>([
      {
        name: 'no days returns null',
        days: {},
        viewYear: 2025,
        viewMonth: 5,
        expected: null,
      },
      {
        name: 'unavailable days only returns null',
        days: { '2025-06-15': mkDay({ availability: DAY_AVAILABILITY.UNAVAILABLE }) },
        viewYear: 2025,
        viewMonth: 5,
        expected: null,
      },
      {
        name: 'days outside view month are excluded',
        days: { '2025-05-15': mkDay({ date: '2025-05-15' }) },
        viewYear: 2025,
        viewMonth: 5,
        expected: null,
      },
      {
        name: 'one good day',
        days: { '2025-06-15': mkDay({ date: '2025-06-15', weatherCode: 0, tempMax: 25, precipitationSum: 2 }) },
        viewYear: 2025,
        viewMonth: 5,
        expected: { goodDays: 1, rainDays: 1, avgMax: 25, totalRain: 2, heavyDays: 0 },
      },
      {
        // Day 10 has precipitationSum: 15 -> getSuitability returns POOR (rule: precip > 5).
        // Only day 11 is "good" (clear sky, dry).
        name: 'mix of good and rainy days',
        days: {
          '2025-06-10': mkDay({ date: '2025-06-10', weatherCode: 0, tempMax: 30, precipitationSum: 15 }),
          '2025-06-11': mkDay({ date: '2025-06-11', weatherCode: 0, tempMax: 20, precipitationSum: 0 }),
        },
        viewYear: 2025,
        viewMonth: 5,
        expected: { goodDays: 1, rainDays: 1, avgMax: 25, totalRain: 15, heavyDays: 1 },
      },
    ])('returns expected for $name', ({ days, viewYear, viewMonth, expected }) => {
      expect(computeMonthStats(days, viewYear, viewMonth)).toEqual(expected);
    });
  });

  describe('computeWeatherCoverage', () => {
    it.each<{
      name: string;
      days: Record<string, DayWeather>;
      expected: ReturnType<typeof computeWeatherCoverage>;
    }>([
      {
        name: 'empty record',
        days: {},
        expected: { historical: 0, forecast: 0, unavailable: 0, rainy: 0, heavyRain: 0, hotDays: 0 },
      },
      {
        name: 'mixed availability counts',
        days: {
          a: mkDay({ availability: DAY_AVAILABILITY.HISTORICAL, precipitationSum: 2, tempMax: 35 }),
          b: mkDay({ availability: DAY_AVAILABILITY.FORECAST, precipitationSum: 15 }),
          c: mkDay({ availability: DAY_AVAILABILITY.UNAVAILABLE, precipitationSum: 100, tempMax: 99 }),
        },
        expected: { historical: 1, forecast: 1, unavailable: 1, rainy: 2, heavyRain: 1, hotDays: 1 },
      },
    ])('returns expected for $name', ({ days, expected }) => {
      expect(computeWeatherCoverage(days)).toEqual(expected);
    });
  });

  describe('pickForecastStrip', () => {
    it.each<{ name: string; availableDays: DayWeather[]; expectedDates: string[] }>([
      {
        name: 'three forecast days are kept',
        availableDays: [
          mkDay({ date: '2025-06-15', availability: DAY_AVAILABILITY.FORECAST }),
          mkDay({ date: '2025-06-16', availability: DAY_AVAILABILITY.FORECAST }),
          mkDay({ date: '2025-06-17', availability: DAY_AVAILABILITY.FORECAST }),
        ],
        expectedDates: ['2025-06-15', '2025-06-16', '2025-06-17'],
      },
      {
        name: 'fallback to last 3 days when not enough forecasts',
        availableDays: [
          mkDay({ date: '2025-06-10', availability: DAY_AVAILABILITY.HISTORICAL }),
          mkDay({ date: '2025-06-11', availability: DAY_AVAILABILITY.HISTORICAL }),
          mkDay({ date: '2025-06-12', availability: DAY_AVAILABILITY.HISTORICAL }),
          mkDay({ date: '2025-06-13', availability: DAY_AVAILABILITY.HISTORICAL }),
        ],
        expectedDates: ['2025-06-11', '2025-06-12', '2025-06-13'],
      },
      {
        name: 'caps to three even with extras',
        availableDays: [
          mkDay({ date: '2025-06-15', availability: DAY_AVAILABILITY.FORECAST }),
          mkDay({ date: '2025-06-16', availability: DAY_AVAILABILITY.FORECAST }),
          mkDay({ date: '2025-06-17', availability: DAY_AVAILABILITY.FORECAST }),
          mkDay({ date: '2025-06-18', availability: DAY_AVAILABILITY.FORECAST }),
        ],
        expectedDates: ['2025-06-15', '2025-06-16', '2025-06-17'],
      },
    ])('returns expected for $name', ({ availableDays, expectedDates }) => {
      expect(pickForecastStrip(availableDays).map(d => d.date)).toEqual(expectedDates);
    });
  });

  describe('buildWeatherIntelligenceData', () => {
    it.each<{
      name: string;
      availableDays: DayWeather[];
      expected: Array<{ date: string; tempAvg: number; rain: number; wind: number }>;
    }>([
      { name: 'empty array', availableDays: [], expected: [] },
      {
        name: 'maps fields and averages temp',
        availableDays: [mkDay({ date: '2025-06-15', tempMax: 30, tempMin: 20, precipitationSum: 5, windSpeedMax: 15 })],
        expected: [{ date: '2025-06-15', tempAvg: 25, rain: 5, wind: 15 }],
      },
    ])('returns expected for $name', ({ availableDays, expected }) => {
      const result = buildWeatherIntelligenceData(availableDays);
      expect(result.length).toBe(expected.length);
      result.forEach((point, i) => {
        expect(point).toMatchObject(expected[i]!);
      });
    });
  });

  describe('classifyHeat', () => {
    it.each<{ name: string; avgTemp: number; expected: Priority }>([
      { name: 'below medium', avgTemp: 30, expected: PRIORITY.LOW },
      { name: 'medium threshold', avgTemp: 31, expected: PRIORITY.MEDIUM },
      { name: 'high threshold', avgTemp: 35, expected: PRIORITY.HIGH },
    ])('returns $expected for $name', ({ avgTemp, expected }) => {
      expect(classifyHeat(avgTemp)).toBe(expected);
    });
  });

  describe('classifyRain', () => {
    it.each<{ name: string; totalRain: number; expected: Priority }>([
      { name: 'below medium', totalRain: 28, expected: PRIORITY.LOW },
      { name: 'medium threshold', totalRain: 29, expected: PRIORITY.MEDIUM },
      { name: 'high threshold', totalRain: 61, expected: PRIORITY.HIGH },
    ])('returns $expected for $name', ({ totalRain, expected }) => {
      expect(classifyRain(totalRain)).toBe(expected);
    });
  });

  describe('classifyWind', () => {
    it.each<{ name: string; avgWind: number; expected: Priority }>([
      { name: 'below medium', avgWind: 22, expected: PRIORITY.LOW },
      { name: 'medium threshold', avgWind: 23, expected: PRIORITY.MEDIUM },
      { name: 'high threshold', avgWind: 33, expected: PRIORITY.HIGH },
    ])('returns $expected for $name', ({ avgWind, expected }) => {
      expect(classifyWind(avgWind)).toBe(expected);
    });
  });

  describe('classifySpray', () => {
    it.each<{
      name: string;
      avgWind: number;
      totalRain: number;
      expected: SprayCondition;
    }>([
      { name: 'high wind is poor', avgWind: 35, totalRain: 0, expected: SPRAY_CONDITION.POOR },
      { name: 'high rain triggers caution', avgWind: 10, totalRain: 50, expected: SPRAY_CONDITION.CAUTION },
      { name: 'calm conditions', avgWind: 10, totalRain: 10, expected: SPRAY_CONDITION.GOOD },
      { name: 'wind takes precedence over rain', avgWind: 35, totalRain: 50, expected: SPRAY_CONDITION.POOR },
    ])('returns $expected for $name', ({ avgWind, totalRain, expected }) => {
      expect(classifySpray(avgWind, totalRain)).toBe(expected);
    });
  });

  describe('getInsightAdvice', () => {
    it.each<{
      name: string;
      insight: ActiveInsightsKey;
      summary: WeekSummary;
      expected: string;
    }>([
      { name: 'heat high', insight: ACTIVE_INSIGHTS_KEYS.HEAT, summary: mkSummary({ avgTemp: 40 }), expected: INSIGHT_ADVICE.HEAT_HIGH },
      { name: 'heat ok', insight: ACTIVE_INSIGHTS_KEYS.HEAT, summary: mkSummary({ avgTemp: 25 }), expected: INSIGHT_ADVICE.HEAT_OK },
      { name: 'rain high', insight: ACTIVE_INSIGHTS_KEYS.RAIN, summary: mkSummary({ totalRain: 70 }), expected: INSIGHT_ADVICE.RAIN_HIGH },
      { name: 'rain ok', insight: ACTIVE_INSIGHTS_KEYS.RAIN, summary: mkSummary({ totalRain: 20 }), expected: INSIGHT_ADVICE.RAIN_OK },
      { name: 'spray poor', insight: ACTIVE_INSIGHTS_KEYS.SPRAY, summary: mkSummary({ avgWind: 35 }), expected: INSIGHT_ADVICE.SPRAY_POOR },
      { name: 'spray ok', insight: ACTIVE_INSIGHTS_KEYS.SPRAY, summary: mkSummary({ avgWind: 10 }), expected: INSIGHT_ADVICE.SPRAY_OK },
    ])('returns $expected for $name', ({ insight, summary, expected }) => {
      expect(getInsightAdvice(insight, summary)).toBe(expected);
    });
  });

  describe('getPrevMonth', () => {
    it.each<{ name: string; input: YearMonth; expected: YearMonth }>([
      { name: 'mid-year', input: { year: 2025, month: 5 }, expected: { year: 2025, month: 4 } },
      { name: 'January rolls back to December', input: { year: 2025, month: 0 }, expected: { year: 2024, month: 11 } },
    ])('returns $expected for $name', ({ input, expected }) => {
      expect(getPrevMonth(input)).toEqual(expected);
    });
  });

  describe('getNextMonth', () => {
    it.each<{ name: string; input: YearMonth; expected: YearMonth }>([
      { name: 'mid-year', input: { year: 2025, month: 5 }, expected: { year: 2025, month: 6 } },
      { name: 'December rolls forward to January', input: { year: 2025, month: 11 }, expected: { year: 2026, month: 0 } },
    ])('returns $expected for $name', ({ input, expected }) => {
      expect(getNextMonth(input)).toEqual(expected);
    });
  });

  describe('parseYearMonth', () => {
    it.each<{ name: string; dateStr: string; expected: YearMonth }>([
      { name: 'mid-year', dateStr: '2025-06-15', expected: { year: 2025, month: 5 } },
      { name: 'January', dateStr: '2025-01-01', expected: { year: 2025, month: 0 } },
      { name: 'December', dateStr: '2025-12-31', expected: { year: 2025, month: 11 } },
    ])('returns $expected for $name', ({ dateStr, expected }) => {
      expect(parseYearMonth(dateStr)).toEqual(expected);
    });
  });

  describe('canNavigateToPrev', () => {
    it.each<{ name: string; current: YearMonth; earliest: YearMonth; expected: boolean }>([
      { name: 'at earliest month', current: { year: 2025, month: 5 }, earliest: { year: 2025, month: 5 }, expected: false },
      { name: 'before earliest month', current: { year: 2025, month: 4 }, earliest: { year: 2025, month: 5 }, expected: false },
      { name: 'after earliest month', current: { year: 2025, month: 6 }, earliest: { year: 2025, month: 5 }, expected: true },
      { name: 'later year', current: { year: 2026, month: 0 }, earliest: { year: 2025, month: 11 }, expected: true },
    ])('returns $expected for $name', ({ current, earliest, expected }) => {
      expect(canNavigateToPrev(current, earliest)).toBe(expected);
    });
  });

  describe('canNavigateToNext', () => {
    it.each<{ name: string; current: YearMonth; latest: YearMonth; expected: boolean }>([
      { name: 'at latest month', current: { year: 2025, month: 5 }, latest: { year: 2025, month: 5 }, expected: false },
      { name: 'after latest month', current: { year: 2025, month: 6 }, latest: { year: 2025, month: 5 }, expected: false },
      { name: 'before latest month', current: { year: 2025, month: 4 }, latest: { year: 2025, month: 5 }, expected: true },
      { name: 'earlier year', current: { year: 2024, month: 11 }, latest: { year: 2025, month: 0 }, expected: true },
    ])('returns $expected for $name', ({ current, latest, expected }) => {
      expect(canNavigateToNext(current, latest)).toBe(expected);
    });
  });

  describe('todayInRangeStr', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // 2025-06-15 local noon
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it.each<{ name: string; planting: string; harvest: string; expected: string | null }>([
      { name: 'today within range', planting: '2025-06-01', harvest: '2025-06-30', expected: '2025-06-15' },
      { name: 'today before planting', planting: '2025-07-01', harvest: '2025-07-31', expected: null },
      { name: 'today after harvest', planting: '2025-05-01', harvest: '2025-05-31', expected: null },
      { name: 'today on planting boundary', planting: '2025-06-15', harvest: '2025-06-30', expected: '2025-06-15' },
      // Harvest is parsed as midnight; any time past midnight on the harvest day is treated as after-harvest.
      { name: 'past midnight on harvest day returns null', planting: '2025-06-01', harvest: '2025-06-15', expected: null },
    ])('returns $expected for $name', ({ planting, harvest, expected }) => {
      expect(todayInRangeStr(planting, harvest)).toBe(expected);
    });
  });
});
