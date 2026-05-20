import type { DayAvailability } from '@/types/weather';
import { CloudOff, History, Radio, type LucideIcon } from 'lucide-react';
import { PRIORITY } from './sidebar';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DOW_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const WEATHER_RANGE = {
  SEVEN_DAYS: '7D',
  FOURTEEN_DAYS: '14D',
  THIRTY_DAYS: '30D',
} as const;

export const WEATHER_RANGE_DAYS = {
  [WEATHER_RANGE.SEVEN_DAYS]: 7,
  [WEATHER_RANGE.FOURTEEN_DAYS]: 14,
  [WEATHER_RANGE.THIRTY_DAYS]: 30,
};

export const METRIC_CHIP_STYLES = {
  [PRIORITY.LOW]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [PRIORITY.MEDIUM]: 'bg-amber-100 text-amber-800 border-amber-200',
  [PRIORITY.HIGH]: 'bg-red-100 text-red-800 border-red-200',
};

export const DAY_AVAILABILITY = {
  HISTORICAL: 'historical',
  FORECAST: 'forecast',
  UNAVAILABLE: 'unavailable',
} as const;

export const AVAIL_BADGE: Record<
  DayAvailability,
  { icon: LucideIcon; color: string; label: string }
> = {
  [DAY_AVAILABILITY.HISTORICAL]: {
    icon: History,
    color: 'text-neutral-600 bg-white/30',
    label: 'Historical',
  },
  [DAY_AVAILABILITY.FORECAST]: {
    icon: Radio,
    color: 'text-white bg-white/30',
    label: 'Forecast',
  },
  [DAY_AVAILABILITY.UNAVAILABLE]: {
    icon: CloudOff,
    color: 'text-white bg-white/20',
    label: 'Not Available',
  },
};

export const ACTIVE_INSIGHTS_KEYS = {
  // 'heat' | 'rain' | 'spray'
  HEAT: 'heat',
  RAIN: 'rain',
  SPRAY: 'spray',
} as const;

export const WEATHER_CHART_MODES = {
  COMBINED: 'combined',
  TEMP: 'temp',
  RAIN: 'rain',
} as const;

export const WEEKLY_SUMMARY_ALERTS = {
  HIGH_TEMPERATURE: 'Heat-wave conditions detected in recent days. Prefer early irrigation windows.',
  HEAVY_RAINFALL: 'Heavy rain event detected. Review drainage and postpone non-essential irrigation.',
  HIGH_WINDS: 'High wind event detected. Avoid spraying during gust periods.',
} as const;

export const INSIGHT_ADVICE = {
  HEAT_HIGH:
    'High heat load this week. Prefer early morning irrigation and monitor canopy wilting zones.',
  HEAT_OK:
    'Heat is manageable. Keep current irrigation timing and continue routine crop observation.',
  RAIN_HIGH:
    'Rain accumulation is high. Delay irrigation and inspect drainage in low-lying areas.',
  RAIN_OK:
    'Rain load is moderate/low. Maintain drainage checks and watch for sudden showers.',
  SPRAY_POOR:
    'Spray conditions are poor due to wind. Wait for calmer windows to reduce spray drift.',
  SPRAY_OK:
    'Spray window is acceptable. Proceed during low-wind hours for better coverage.',
} as const;

export const SUITABILITY_LABEL = {
  NONE: '-',
  NOT_SUITABLE: 'Not Suitable',
  POOR: 'Poor',
  CAUTION: 'Caution',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
} as const;

export const SPRAY_CONDITION = {
  POOR: 'Poor',
  CAUTION: 'Caution',
  GOOD: 'Good',
} as const;

/**
 * Centralized numeric cutoffs used by weather classification and JSX threshold
 * logic. Grouped by feature so each consumer can lift its magic numbers in one
 * place without crashing into unrelated thresholds.
 */
export const WEATHER_THRESHOLDS = {
  // Weekly averages → drives Heat/Rain/Wind chips, scoring, advice copy
  WEEKLY_TEMP_HIGH: 34,
  WEEKLY_TEMP_MEDIUM: 30,
  WEEKLY_RAIN_HIGH: 60,
  WEEKLY_RAIN_MEDIUM: 28,
  WEEKLY_WIND_HIGH: 32,
  WEEKLY_WIND_MEDIUM: 22,
  // Single-day extremes that trigger the weekly alert banner
  ALERT_MAX_TEMP: 40,
  ALERT_DAY_RAIN: 30,
  ALERT_MAX_WIND: 45,
  // Per-day risk classification → drives calendar-cell coloring
  RISK_MAX_TEMP_HIGH: 38,
  RISK_MAX_TEMP_MEDIUM: 33,
  RISK_RAIN_HIGH: 20,
  RISK_RAIN_MEDIUM: 8,
  RISK_WIND_HIGH: 45,
  RISK_WIND_MEDIUM: 30,
  // Spray window picks Caution when weekly rain exceeds this
  SPRAY_RAIN_CAUTION: 40,
  // Coverage stat buckets
  HOT_DAY_TEMP: 35,
  RAINY_DAY_MIN: 1,
  HEAVY_RAIN_DAY: 10,
} as const;