import {
  ACTIVE_INSIGHTS_KEYS,
  DAY_AVAILABILITY,
  INSIGHT_ADVICE,
  PRIORITY,
  SPRAY_CONDITION,
  SUITABILITY_LABEL,
  WEATHER_THRESHOLDS,
  WEEKLY_SUMMARY_ALERTS,
} from '@/constants';
import type {
  ActiveInsightsKey,
  DayWeather,
  MonthStats,
  Priority,
  SprayCondition,
  WeatherCoverage,
  WeatherIntelligencePoint,
  WeekSummary,
  YearMonth,
} from '@/types';

export interface RainInfo {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  advice: string;
  cellTint: string;
}

export interface Suitability {
  label: string;
  color: string;
  bg: string;
  cellBg: string;
  dot: string;
}

export function weatherEmoji(code: number): string {
  if (code === -1) return '?';
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 67) return '🌨️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '❄️';
  return '⛈️';
}

export function weatherLabel(code: number): string {
  if (code === -1) return 'No data yet';
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Partly Cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 67) return 'Freezing Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

export function getRainInfo(
  precipMm: number,
  precipProb: number | null
): RainInfo {
  const prob = precipProb ?? 0;
  const intensity =
    precipMm > 20
      ? 'heavy'
      : precipMm > 8
        ? 'moderate'
        : precipMm > 1
          ? 'light'
          : prob >= 70
            ? 'moderate'
            : prob >= 40
              ? 'light'
              : 'dry';

  const map: Record<string, RainInfo> = {
    heavy: {
      label: 'Heavy Rain',
      emoji: '🌧️',
      color: 'text-blue-800',
      bg: 'bg-blue-100',
      border: 'border-blue-300',
      barColor: '#1d4ed8',
      advice: 'Avoid field work. Risk of soil erosion.',
      cellTint: 'bg-blue-200/60',
    },
    moderate: {
      label: 'Moderate Rain',
      emoji: '🌦️',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      barColor: '#3b82f6',
      advice: 'Delay spraying. Check drainage.',
      cellTint: 'bg-blue-100/50',
    },
    light: {
      label: 'Light Rain',
      emoji: '🌂',
      color: 'text-sky-700',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      barColor: '#38bdf8',
      advice: 'Light irrigation may not be needed.',
      cellTint: 'bg-sky-100/40',
    },
    dry: {
      label: 'Dry Day',
      emoji: '☀️',
      color: 'text-neutral-600',
      bg: 'bg-neutral-50',
      border: 'border-neutral-200',
      barColor: '#d1d5db',
      advice: 'Consider irrigation if soil moisture is low.',
      cellTint: '',
    },
  };

  return (map[intensity] ?? map['dry']) as RainInfo;
}

export function conditionGradient(code: number): string {
  if (code === 0) return 'from-amber-400 to-orange-500';
  if (code <= 2) return 'from-sky-400 to-blue-500';
  if (code <= 3) return 'from-slate-400 to-slate-500';
  if (code <= 48) return 'from-slate-300 to-slate-400';
  if (code <= 65) return 'from-blue-500 to-indigo-600';
  if (code <= 77) return 'from-slate-300 to-blue-300';
  return 'from-slate-600 to-slate-800';
}

export function getSuitability(day: DayWeather): Suitability {
  if (day.availability === DAY_AVAILABILITY.UNAVAILABLE) {
    return {
      label: SUITABILITY_LABEL.NONE,
      color: 'text-neutral-400',
      bg: 'bg-neutral-50 border-neutral-100',
      cellBg: '',
      dot: 'bg-neutral-300',
    };
  }
  if (day.weatherCode >= 95) {
    return {
      label: SUITABILITY_LABEL.NOT_SUITABLE,
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
      cellBg: 'bg-red-50/50',
      dot: 'bg-red-500',
    };
  }
  if (day.weatherCode >= 61 || day.precipitationSum > 5) {
    return {
      label: SUITABILITY_LABEL.POOR,
      color: 'text-orange-700',
      bg: 'bg-orange-50 border-orange-200',
      cellBg: 'bg-orange-50/50',
      dot: 'bg-orange-500',
    };
  }
  if (day.windSpeedMax > 35) {
    return {
      label: SUITABILITY_LABEL.CAUTION,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50 border-yellow-200',
      cellBg: 'bg-yellow-50/40',
      dot: 'bg-yellow-500',
    };
  }
  if (day.weatherCode === 0 || day.weatherCode <= 2) {
    return {
      label: SUITABILITY_LABEL.EXCELLENT,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      cellBg: 'bg-emerald-50/30',
      dot: 'bg-emerald-500',
    };
  }
  return {
    label: SUITABILITY_LABEL.GOOD,
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    cellBg: '',
    dot: 'bg-green-500',
  };
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function buildMonthGrid(
  year: number,
  month: number
): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay();
  startDow = (startDow + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function getRiskTone(day: DayWeather): Priority {
  if (day.availability === DAY_AVAILABILITY.UNAVAILABLE) return PRIORITY.LOW;
  if (
    day.tempMax >= WEATHER_THRESHOLDS.RISK_MAX_TEMP_HIGH ||
    day.precipitationSum >= WEATHER_THRESHOLDS.RISK_RAIN_HIGH ||
    day.windSpeedMax >= WEATHER_THRESHOLDS.RISK_WIND_HIGH
  ) {
    return PRIORITY.HIGH;
  }
  if (
    day.tempMax >= WEATHER_THRESHOLDS.RISK_MAX_TEMP_MEDIUM ||
    day.precipitationSum >= WEATHER_THRESHOLDS.RISK_RAIN_MEDIUM ||
    day.windSpeedMax >= WEATHER_THRESHOLDS.RISK_WIND_MEDIUM
  ) {
    return PRIORITY.MEDIUM;
  }
  return PRIORITY.LOW;
}

// ─── Weekly / monthly aggregates ────────────────────────────────────────────

export function computeWeekSummary(recentWeek: DayWeather[]): WeekSummary {
  if (recentWeek.length === 0) {
    return {
      avgTemp: 0,
      totalRain: 0,
      avgWind: 0,
      riskLevel: PRIORITY.LOW,
    };
  }

  const avgTemp =
    recentWeek.reduce((sum, d) => sum + (d.tempMax + d.tempMin) / 2, 0) /
    recentWeek.length;
  const totalRain = recentWeek.reduce(
    (sum, d) => sum + d.precipitationSum,
    0
  );
  const avgWind =
    recentWeek.reduce((sum, d) => sum + d.windSpeedMax, 0) / recentWeek.length;

  const score =
    (avgTemp > WEATHER_THRESHOLDS.WEEKLY_TEMP_HIGH ? 1 : 0) +
    (totalRain > WEATHER_THRESHOLDS.WEEKLY_RAIN_HIGH ? 1 : 0) +
    (avgWind > WEATHER_THRESHOLDS.WEEKLY_WIND_HIGH ? 1 : 0);

  const riskLevel =
    score >= 2 ? PRIORITY.HIGH : score === 1 ? PRIORITY.MEDIUM : PRIORITY.LOW;

  return { avgTemp, totalRain, avgWind, riskLevel };
}

export function getWeeklyAlert(recentWeek: DayWeather[]): string | null {
  if (recentWeek.some(d => d.tempMax >= WEATHER_THRESHOLDS.ALERT_MAX_TEMP)) {
    return WEEKLY_SUMMARY_ALERTS.HIGH_TEMPERATURE;
  }
  if (
    recentWeek.some(d => d.precipitationSum >= WEATHER_THRESHOLDS.ALERT_DAY_RAIN)
  ) {
    return WEEKLY_SUMMARY_ALERTS.HEAVY_RAINFALL;
  }
  if (
    recentWeek.some(d => d.windSpeedMax >= WEATHER_THRESHOLDS.ALERT_MAX_WIND)
  ) {
    return WEEKLY_SUMMARY_ALERTS.HIGH_WINDS;
  }
  return null;
}

export function computeMonthStats(
  days: Record<string, DayWeather>,
  viewYear: number,
  viewMonth: number
): MonthStats | null {
  const monthDays = Object.values(days).filter(d => {
    const [y, m] = d.date.split('-').map(Number);
    return (
      y === viewYear &&
      m === viewMonth + 1 &&
      d.availability !== DAY_AVAILABILITY.UNAVAILABLE
    );
  });

  if (monthDays.length === 0) return null;

  const goodLabels: string[] = [
    SUITABILITY_LABEL.EXCELLENT,
    SUITABILITY_LABEL.GOOD,
  ];
  const goodDays = monthDays.filter(d =>
    goodLabels.includes(getSuitability(d).label)
  ).length;
  const rainDays = monthDays.filter(
    d => d.precipitationSum > WEATHER_THRESHOLDS.RAINY_DAY_MIN
  ).length;
  const avgMax = Math.round(
    monthDays.reduce((s, d) => s + d.tempMax, 0) / monthDays.length
  );
  const totalRain = Math.round(
    monthDays.reduce((s, d) => s + d.precipitationSum, 0)
  );
  const heavyDays = monthDays.filter(
    d => d.precipitationSum > WEATHER_THRESHOLDS.HEAVY_RAIN_DAY
  ).length;

  return { goodDays, rainDays, avgMax, totalRain, heavyDays };
}

export function computeWeatherCoverage(
  days: Record<string, DayWeather>
): WeatherCoverage {
  const all = Object.values(days);
  const historical = all.filter(
    d => d.availability === DAY_AVAILABILITY.HISTORICAL
  ).length;
  const forecast = all.filter(
    d => d.availability === DAY_AVAILABILITY.FORECAST
  ).length;
  const unavailable = all.filter(
    d => d.availability === DAY_AVAILABILITY.UNAVAILABLE
  ).length;
  const rainy = all.filter(
    d =>
      d.availability !== DAY_AVAILABILITY.UNAVAILABLE &&
      d.precipitationSum > WEATHER_THRESHOLDS.RAINY_DAY_MIN
  ).length;
  const heavyRain = all.filter(
    d =>
      d.availability !== DAY_AVAILABILITY.UNAVAILABLE &&
      d.precipitationSum > WEATHER_THRESHOLDS.HEAVY_RAIN_DAY
  ).length;
  const hotDays = all.filter(
    d =>
      d.availability !== DAY_AVAILABILITY.UNAVAILABLE &&
      d.tempMax >= WEATHER_THRESHOLDS.HOT_DAY_TEMP
  ).length;
  return { historical, forecast, unavailable, rainy, heavyRain, hotDays };
}

export function pickForecastStrip(availableDays: DayWeather[]): DayWeather[] {
  const forecastOnly = availableDays.filter(
    d => d.availability === DAY_AVAILABILITY.FORECAST
  );
  const source =
    forecastOnly.length >= 3 ? forecastOnly : availableDays.slice(-3);
  return source.slice(0, 3);
}

export function buildWeatherIntelligenceData(
  availableDays: DayWeather[]
): WeatherIntelligencePoint[] {
  return availableDays.map(d => ({
    date: d.date,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    tempAvg: (d.tempMax + d.tempMin) / 2,
    rain: d.precipitationSum,
    wind: d.windSpeedMax,
  }));
}

// ─── Threshold classifiers (used by chip labels + advice copy) ──────────────

export function classifyHeat(avgTemp: number): Priority {
  if (avgTemp > WEATHER_THRESHOLDS.WEEKLY_TEMP_HIGH) return PRIORITY.HIGH;
  if (avgTemp > WEATHER_THRESHOLDS.WEEKLY_TEMP_MEDIUM) return PRIORITY.MEDIUM;
  return PRIORITY.LOW;
}

export function classifyRain(totalRain: number): Priority {
  if (totalRain > WEATHER_THRESHOLDS.WEEKLY_RAIN_HIGH) return PRIORITY.HIGH;
  if (totalRain > WEATHER_THRESHOLDS.WEEKLY_RAIN_MEDIUM) return PRIORITY.MEDIUM;
  return PRIORITY.LOW;
}

export function classifyWind(avgWind: number): Priority {
  if (avgWind > WEATHER_THRESHOLDS.WEEKLY_WIND_HIGH) return PRIORITY.HIGH;
  if (avgWind > WEATHER_THRESHOLDS.WEEKLY_WIND_MEDIUM) return PRIORITY.MEDIUM;
  return PRIORITY.LOW;
}

export function classifySpray(
  avgWind: number,
  totalRain: number
): SprayCondition {
  if (avgWind > WEATHER_THRESHOLDS.WEEKLY_WIND_HIGH) return SPRAY_CONDITION.POOR;
  if (totalRain > WEATHER_THRESHOLDS.SPRAY_RAIN_CAUTION)
    return SPRAY_CONDITION.CAUTION;
  return SPRAY_CONDITION.GOOD;
}

export function getInsightAdvice(
  insight: ActiveInsightsKey,
  weekSummary: WeekSummary
): string {
  if (insight === ACTIVE_INSIGHTS_KEYS.HEAT) {
    return weekSummary.avgTemp > WEATHER_THRESHOLDS.WEEKLY_TEMP_HIGH
      ? INSIGHT_ADVICE.HEAT_HIGH
      : INSIGHT_ADVICE.HEAT_OK;
  }
  if (insight === ACTIVE_INSIGHTS_KEYS.RAIN) {
    return weekSummary.totalRain > WEATHER_THRESHOLDS.WEEKLY_RAIN_HIGH
      ? INSIGHT_ADVICE.RAIN_HIGH
      : INSIGHT_ADVICE.RAIN_OK;
  }
  return weekSummary.avgWind > WEATHER_THRESHOLDS.WEEKLY_WIND_HIGH
    ? INSIGHT_ADVICE.SPRAY_POOR
    : INSIGHT_ADVICE.SPRAY_OK;
}

// ─── Month navigation (pure logic; setState lives in the component) ─────────

export function getPrevMonth({ year, month }: YearMonth): YearMonth {
  return month === 0
    ? { year: year - 1, month: 11 }
    : { year, month: month - 1 };
}

export function getNextMonth({ year, month }: YearMonth): YearMonth {
  return month === 11
    ? { year: year + 1, month: 0 }
    : { year, month: month + 1 };
}

export function parseYearMonth(dateStr: string): YearMonth {
  const d = new Date(`${dateStr}T00:00:00`);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function canNavigateToPrev(
  current: YearMonth,
  earliest: YearMonth
): boolean {
  return (
    current.year > earliest.year ||
    (current.year === earliest.year && current.month > earliest.month)
  );
}

export function canNavigateToNext(
  current: YearMonth,
  latest: YearMonth
): boolean {
  return (
    current.year < latest.year ||
    (current.year === latest.year && current.month < latest.month)
  );
}

/**
 * Returns today's date as "YYYY-MM-DD" if it falls between plantingDate and
 * harvestDate (inclusive), otherwise null. Used by the Today quick-jump button.
 */
export function todayInRangeStr(
  plantingDate: string,
  harvestDate: string
): string | null {
  const today = new Date();
  const start = new Date(`${plantingDate}T00:00:00`);
  const end = new Date(`${harvestDate}T00:00:00`);
  return today >= start && today <= end ? toDateStr(today) : null;
}
