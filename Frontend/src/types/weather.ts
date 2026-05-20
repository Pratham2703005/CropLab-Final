import type {
  ACTIVE_INSIGHTS_KEYS,
  DAY_AVAILABILITY,
  SPRAY_CONDITION,
  SUITABILITY_LABEL,
  WEATHER_CHART_MODES,
  WEATHER_RANGE_DAYS,
} from '@/constants';
import type { Priority } from './sidebar';

export type DayAvailability = typeof DAY_AVAILABILITY[keyof typeof DAY_AVAILABILITY];

export interface DayWeather {
  date: string; // "YYYY-MM-DD"
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbability: number | null; // null for historical (not provided by archive API)
  windSpeedMax: number;
  uvIndexMax: number;
  availability: DayAvailability;
}

export interface WeatherCalendarData {
  days: Record<string, DayWeather>; // keyed by "YYYY-MM-DD"
  plantingDate: string;
  harvestDate: string;
  latitude: number;
  longitude: number;
}

export type ActiveInsightsKey = typeof ACTIVE_INSIGHTS_KEYS[keyof typeof ACTIVE_INSIGHTS_KEYS];

export type WeatherRangeKey = keyof typeof WEATHER_RANGE_DAYS;

export type WeatherChartMode = typeof WEATHER_CHART_MODES[keyof typeof WEATHER_CHART_MODES];

export type SuitabilityLabel = typeof SUITABILITY_LABEL[keyof typeof SUITABILITY_LABEL];

export type SprayCondition = typeof SPRAY_CONDITION[keyof typeof SPRAY_CONDITION];

export interface WeekSummary {
  avgTemp: number;
  totalRain: number;
  avgWind: number;
  riskLevel: Priority;
}

export interface MonthStats {
  goodDays: number;
  rainDays: number;
  avgMax: number;
  totalRain: number;
  heavyDays: number;
}

export interface WeatherCoverage {
  historical: number;
  forecast: number;
  unavailable: number;
  rainy: number;
  heavyRain: number;
  hotDays: number;
}

export interface WeatherIntelligencePoint {
  date: string;
  label: string;
  tempAvg: number;
  rain: number;
  wind: number;
}

export interface YearMonth {
  year: number;
  month: number; // 0-indexed (matches Date.getMonth())
}
    