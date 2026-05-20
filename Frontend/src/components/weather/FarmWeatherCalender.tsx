import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WeatherIntelligenceTooltip } from './WeatherTooltips';
import { DayDetailView } from './DayDetailView';
import {
  ChevronLeft,
  ChevronRight,
  Sprout,
  RefreshCw,
  Sparkles,
  Calendar,
  Clock3,
  Wind,
  Droplets,
  Sun,
  History,
  AlertTriangle,
} from 'lucide-react';
import {
  weatherEmoji,
  weatherLabel,
  getRiskTone,
  toDateStr,
  buildMonthGrid,
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
} from '@/utils';
import {
  MONTHS,
  PRIORITY,
  DOW_SHORT,
  WEATHER_RANGE_DAYS,
  METRIC_CHIP_STYLES,
  WEATHER_RANGE,
  WEATHER_CHART_MODES,
  DAY_AVAILABILITY,
} from '@/constants';
import type {
  ActiveInsightsKey,
  WeatherCalendarData,
  WeatherChartMode,
  WeatherRangeKey,
  YearMonth,
} from '@/types';

interface FarmWeatherCalendarProps {
  calendarData: WeatherCalendarData;
  onRefresh: () => void;
  loading?: boolean;
}

export const FarmWeatherCalendar: React.FC<FarmWeatherCalendarProps> = ({
  calendarData,
  onRefresh,
  loading = false,
}) => {
  const { days, plantingDate, harvestDate } = calendarData;

  const plantDate = new Date(`${plantingDate}T00:00:00`);
  const harvestDt = new Date(`${harvestDate}T00:00:00`);
  const todayStr = toDateStr(new Date());

  const [viewYear, setViewYear] = useState(plantDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(plantDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeInsight, setActiveInsight] = useState<
    ActiveInsightsKey | null
  >(null);
  const [selectedWeatherRange, setSelectedWeatherRange] =
    useState<WeatherRangeKey>(WEATHER_RANGE.FOURTEEN_DAYS);
  const [weatherChartMode, setWeatherChartMode] = useState<WeatherChartMode>(WEATHER_CHART_MODES.COMBINED);
  const [showMoreWeatherInfo, setShowMoreWeatherInfo] = useState(false);

  const current: YearMonth = { year: viewYear, month: viewMonth };
  const earliest = parseYearMonth(plantingDate);
  const latest = parseYearMonth(harvestDate);

  const canGoPrev = canNavigateToPrev(current, earliest);
  const canGoNext = canNavigateToNext(current, latest);

  function prevMonth() {
    if (!canGoPrev) return;
    const { year, month } = getPrevMonth(current);
    setViewYear(year);
    setViewMonth(month);
  }

  function nextMonth() {
    if (!canGoNext) return;
    const { year, month } = getNextMonth(current);
    setViewYear(year);
    setViewMonth(month);
  }

  function jumpTo(dateStr: string) {
    const { year, month } = parseYearMonth(dateStr);
    setViewYear(year);
    setViewMonth(month);
  }

  function jumpToToday() {
    const todayStr = todayInRangeStr(plantingDate, harvestDate);
    if (todayStr) jumpTo(todayStr);
  }

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const availableDays = useMemo(
    () =>
      Object.values(days)
        .filter(d => d.availability !== DAY_AVAILABILITY.UNAVAILABLE)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [days]
  );

  const recentWeek = availableDays.slice(-7);
  const todayData = days[todayStr] ?? availableDays[availableDays.length - 1];

  const weekSummary = useMemo(
    () => computeWeekSummary(recentWeek),
    [recentWeek]
  );

  const weeklyAlert = useMemo(() => getWeeklyAlert(recentWeek), [recentWeek]);

  const forecastStrip = useMemo(
    () => pickForecastStrip(availableDays),
    [availableDays]
  );

  const weatherIntelligenceData = useMemo(
    () => buildWeatherIntelligenceData(availableDays),
    [availableDays]
  );

  const filteredWeatherIntelligenceData = useMemo(() => {
    const take = WEATHER_RANGE_DAYS[selectedWeatherRange];
    return weatherIntelligenceData.slice(-take);
  }, [weatherIntelligenceData, selectedWeatherRange]);

  const monthStats = useMemo(
    () => computeMonthStats(days, viewYear, viewMonth),
    [days, viewYear, viewMonth]
  );

  const weatherCoverage = useMemo(
    () => computeWeatherCoverage(days),
    [days]
  );

  const selectedDay = selectedDate ? days[selectedDate] : null;

  if (selectedDate && selectedDay) {
    return (
      <DayDetailView
        day={selectedDay}
        allDays={days}
        onBack={() => setSelectedDate(null)}
      />
    );
  }

  return (
    <div className='animate-in'>
      <div className='relative mb-2 overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-500 p-2 text-white shadow-sm'>
        <div className='pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-200/20 blur-2xl animate-pulse' />
        <div className='mb-1.5 flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${METRIC_CHIP_STYLES[weekSummary.riskLevel]}`}
              >
                Risk: {weekSummary.riskLevel}
              </span>
              <p className='truncate text-[11px] font-medium text-emerald-50/90'>
                {todayData
                  ? `${Math.round((todayData.tempMax + todayData.tempMin) / 2)} C, ${todayData.precipitationSum.toFixed(1)} mm`
                  : 'No live day data'}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            title='Refresh'
            className='rounded-md border border-white/30 bg-white/15 p-1 text-white transition hover:bg-white/25'
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className='grid grid-cols-3 gap-1'>
          <button
            type='button'
            onClick={() =>
              setActiveInsight(prev => (prev === 'heat' ? null : 'heat'))
            }
            className={`rounded-md border px-1.5 py-1 text-left backdrop-blur-sm transition-all ${activeInsight === 'heat' ? 'border-orange-200 bg-orange-100/90 ring-1 ring-orange-200' : 'border-white/25 bg-white/20 hover:bg-white/30'}`}
          >
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1 text-[9px] text-emerald-50/90'>
                <Sun className='h-3 w-3' />
                Heat
              </span>
              <p className='text-[10px] font-semibold text-white'>
                {classifyHeat(weekSummary.avgTemp)}
              </p>
            </div>
          </button>
          <button
            type='button'
            onClick={() =>
              setActiveInsight(prev => (prev === 'rain' ? null : 'rain'))
            }
            className={`rounded-md border px-1.5 py-1 text-left backdrop-blur-sm transition-all ${activeInsight === 'rain' ? 'border-sky-200 bg-sky-100/90 ring-1 ring-sky-200' : 'border-white/25 bg-white/20 hover:bg-white/30'}`}
          >
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1 text-[9px] text-emerald-50/90'>
                <Droplets className='h-3 w-3' />
                Rain
              </span>
              <p className='text-[10px] font-semibold text-white'>
                {classifyRain(weekSummary.totalRain)}
              </p>
            </div>
          </button>
          <button
            type='button'
            onClick={() =>
              setActiveInsight(prev => (prev === 'spray' ? null : 'spray'))
            }
            className={`rounded-md border px-1.5 py-1 text-left backdrop-blur-sm transition-all ${activeInsight === 'spray' ? 'border-emerald-200 bg-emerald-100/90 ring-1 ring-emerald-200' : 'border-white/25 bg-white/20 hover:bg-white/30'}`}
          >
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1 text-[9px] text-emerald-50/90'>
                <Wind className='h-3 w-3' />
                Spray
              </span>
              <p className='text-[10px] font-semibold text-white'>
                {classifySpray(weekSummary.avgWind, weekSummary.totalRain)}
              </p>
            </div>
          </button>
        </div>
        {activeInsight && (
          <p className='mt-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-emerald-50/95'>
            {getInsightAdvice(activeInsight, weekSummary)}
          </p>
        )}
        {weeklyAlert && (
          <div className='mt-1 rounded-md border border-red-200/70 bg-red-100/90 p-1.5'>
            <div className='flex items-start gap-1.5'>
              <AlertTriangle className='mt-0.5 h-3.5 w-3.5 text-red-700' />
              <p className='text-[10px] text-red-900'>{weeklyAlert}</p>
            </div>
          </div>
        )}

        <div className='mt-2 rounded-lg border border-white/25 bg-white/10 p-2 backdrop-blur-sm'>
          <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] font-medium text-emerald-50'>
              {new Date(`${plantingDate}T00:00:00`).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                }
              )}
              {' → '}
              {new Date(`${harvestDate}T00:00:00`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className='inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-50'>
              Tap a date for details
            </div>
          </div>

          <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center'>
              <button
                onClick={prevMonth}
                disabled={!canGoPrev}
                className='rounded-md p-1 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30'
              >
                <ChevronLeft className='h-3.5 w-3.5 text-emerald-50' />
              </button>
              <h4 className='min-w-[90px] text-center text-xs font-bold text-white'>
                {MONTHS[viewMonth]} {viewYear}
              </h4>
              <button
                onClick={nextMonth}
                disabled={!canGoNext}
                className='rounded-md p-1 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30'
              >
                <ChevronRight className='h-3.5 w-3.5 text-emerald-50' />
              </button>
            </div>
            <div className='flex min-w-0 flex-wrap items-center justify-end gap-1'>
              <button
                onClick={() => jumpTo(plantingDate)}
                className='flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-50'
                title='Jump to sowing date'
              >
                <Sprout className='h-2.5 w-2.5' />
                <span>Sow</span>
              </button>
              <button
                onClick={() => jumpTo(harvestDate)}
                className='flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-50'
                title='Jump to harvest date'
              >
                <span className='text-[9px]'>🌾</span>
                <span>Harvest</span>
              </button>
              <button
                onClick={jumpToToday}
                className='rounded-md border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 hover:bg-sky-50'
                title='Jump to today'
              >
                Today
              </button>
            </div>
          </div>

          <div className='mb-1 grid grid-cols-7'>
            {DOW_SHORT.map(d => (
              <div
                key={d}
                className='py-0.5 text-center text-[9px] font-semibold text-emerald-100/90'
              >
                {d}
              </div>
            ))}
          </div>

          <div className='overflow-hidden rounded-lg border border-white/20 bg-white/10'>
            {grid.map((row, ri) => (
              <div key={ri} className='grid grid-cols-7'>
                {row.map((dateStr, ci) => {
                  if (!dateStr) {
                    return (
                      <div
                        key={ci}
                        className={`h-10 border-b border-r border-white/10 ${ri === grid.length - 1 ? 'border-b-0' : ''} ${ci === 6 ? 'border-r-0' : ''}`}
                      />
                    );
                  }

                  const dt = new Date(`${dateStr}T00:00:00`);
                  const inRange = dt >= plantDate && dt <= harvestDt;
                  const dayData = days[dateStr];
                  const isToday = dateStr === todayStr;
                  const isPlanting = dateStr === plantingDate;
                  const isHarvest = dateStr === harvestDate;
                  const riskTone =
                    dayData && dayData.availability !== DAY_AVAILABILITY.UNAVAILABLE
                      ? getRiskTone(dayData)
                      : PRIORITY.LOW;

                  let cellBg = '';
                  if (!inRange) cellBg = 'bg-emerald-950/40';
                  else if (riskTone === PRIORITY.HIGH) cellBg = 'bg-red-300/25';
                  else if (riskTone === PRIORITY.MEDIUM) cellBg = 'bg-amber-200/20';
                  else cellBg = 'bg-emerald-200/20';

                  return (
                    <button
                      key={dateStr}
                      disabled={!inRange}
                      onClick={() => setSelectedDate(dateStr)}
                      title={
                        dayData && dayData.availability !== DAY_AVAILABILITY.UNAVAILABLE
                          ? `${new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} | ${weatherLabel(dayData.weatherCode)} | ${Math.round(dayData.tempMax)}°/${Math.round(dayData.tempMin)}° | ${dayData.precipitationSum.toFixed(1)}mm rain | ${getRiskTone(dayData)} risk`
                          : new Date(`${dateStr}T00:00:00`).toLocaleDateString(
                              'en-US',
                              {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              }
                            )
                      }
                      className={`
                        relative h-11 transform-gpu overflow-hidden border-b border-r border-white/10 pt-px transition-all duration-150
                        flex flex-col items-center justify-start
                        ${ri === grid.length - 1 ? 'border-b-0' : ''}
                        ${ci === 6 ? 'border-r-0' : ''}
                        ${cellBg}
                        ${inRange ? 'cursor-pointer hover:bg-emerald-100/25 hover:-translate-y-[1px] active:translate-y-0 active:bg-emerald-100/35' : ''}
                      `}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold
                        ${isToday ? 'bg-emerald-100 text-emerald-900' : ''}
                        ${!inRange ? 'text-emerald-100/40' : !isToday ? 'text-emerald-50' : ''}
                      `}
                      >
                        {dt.getDate()}
                      </span>
                      {isPlanting && (
                        <span className='absolute left-0 top-0 text-[6px] leading-none'>
                          🌱
                        </span>
                      )}
                      {isHarvest && (
                        <span className='absolute right-0 top-0 text-[6px] leading-none'>
                          🌾
                        </span>
                      )}
                      {inRange &&
                        dayData &&
                        dayData.availability !== DAY_AVAILABILITY.UNAVAILABLE && (
                          <span
                            className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${riskTone === PRIORITY.HIGH ? 'bg-red-400' : riskTone === PRIORITY.MEDIUM ? 'bg-amber-400' : 'bg-emerald-300'}`}
                          />
                        )}
                      {inRange &&
                        dayData &&
                        (dayData.availability === DAY_AVAILABILITY.UNAVAILABLE ? (
                          <span className='text-[9px] leading-none'>🔮</span>
                        ) : (
                          <>
                            <span className='text-[9px] leading-none'>
                              {weatherEmoji(dayData.weatherCode)}
                            </span>
                            <span className='text-[7px] font-bold leading-none text-emerald-50/90'>
                              {Math.round(dayData.tempMax)}°
                            </span>
                          </>
                        ))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='mb-2 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-2 shadow-sm'>
        <div className='mb-1.5 flex items-center justify-between'>
          <h4 className='text-xs font-semibold text-emerald-950'>
            Weather Intelligence
          </h4>
          <div className='inline-flex rounded-md border border-emerald-200 bg-white p-0.5'>
            {([WEATHER_RANGE.SEVEN_DAYS, WEATHER_RANGE.FOURTEEN_DAYS, WEATHER_RANGE.THIRTY_DAYS] as WeatherRangeKey[]).map(range => (
              <button
                key={range}
                type='button'
                onClick={() => setSelectedWeatherRange(range)}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${selectedWeatherRange === range ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-emerald-50'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className='mb-1.5 inline-flex rounded-md border border-emerald-200 bg-white p-0.5'>
          <button
            type='button'
            onClick={() => setWeatherChartMode(WEATHER_CHART_MODES.COMBINED)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${weatherChartMode === WEATHER_CHART_MODES.COMBINED ? 'bg-emerald-900 text-white' : 'text-neutral-600 hover:bg-emerald-50'}`}
          >
            Combined
          </button>
          <button
            type='button'
            onClick={() => setWeatherChartMode(WEATHER_CHART_MODES.TEMP)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${weatherChartMode === WEATHER_CHART_MODES.TEMP ? 'bg-emerald-900 text-white' : 'text-neutral-600 hover:bg-emerald-50'}`}
          >
            Temp
          </button>
          <button
            type='button'
            onClick={() => setWeatherChartMode(WEATHER_CHART_MODES.RAIN)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${weatherChartMode === WEATHER_CHART_MODES.RAIN ? 'bg-emerald-900 text-white' : 'text-neutral-600 hover:bg-emerald-50'}`}
          >
            Rain
          </button>
        </div>

        {filteredWeatherIntelligenceData.length > 0 ? (
          <ResponsiveContainer width='100%' height={128}>
            {weatherChartMode === WEATHER_CHART_MODES.COMBINED ? (
              <ComposedChart
                data={filteredWeatherIntelligenceData}
                margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#bbf7d0'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  yAxisId='left'
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId='right'
                  orientation='right'
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<WeatherIntelligenceTooltip />} />
                <Bar
                  yAxisId='right'
                  dataKey='rain'
                  fill='#34d399'
                  radius={[3, 3, 0, 0]}
                  maxBarSize={14}
                />
                <Line
                  yAxisId='left'
                  type='monotone'
                  dataKey='tempAvg'
                  stroke='#059669'
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 3.5 }}
                />
              </ComposedChart>
            ) : weatherChartMode === WEATHER_CHART_MODES.TEMP ? (
              <AreaChart
                data={filteredWeatherIntelligenceData}
                margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id='weatherTempFill'
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop offset='5%' stopColor='#10b981' stopOpacity={0.35} />
                    <stop offset='95%' stopColor='#10b981' stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#bbf7d0'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<WeatherIntelligenceTooltip />} />
                <Area
                  type='monotone'
                  dataKey='tempAvg'
                  stroke='#059669'
                  strokeWidth={2}
                  fill='url(#weatherTempFill)'
                />
              </AreaChart>
            ) : (
              <BarChart
                data={filteredWeatherIntelligenceData}
                margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#bbf7d0'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<WeatherIntelligenceTooltip />} />
                <Bar
                  dataKey='rain'
                  fill='#34d399'
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className='rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-center text-[10px] text-neutral-500'>
            Not enough weather points for visualization.
          </div>
        )}

        <div className='mt-1.5 flex flex-wrap gap-1'>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${METRIC_CHIP_STYLES[classifyHeat(weekSummary.avgTemp)]}`}
          >
            Avg Temp {weekSummary.avgTemp.toFixed(1)} C
          </span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${METRIC_CHIP_STYLES[classifyRain(weekSummary.totalRain)]}`}
          >
            Rain {weekSummary.totalRain.toFixed(1)} mm
          </span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${METRIC_CHIP_STYLES[classifyWind(weekSummary.avgWind)]}`}
          >
            Wind {weekSummary.avgWind.toFixed(0)} km/h
          </span>
        </div>
      </div>

      <div className='mb-2 rounded-lg border border-neutral-200 bg-white p-1.5'>
        <div className='mb-1 flex items-center justify-between'>
          <p className='text-[10px] font-semibold text-neutral-700'>
            3-Day Forecast
          </p>
          <span className='text-[9px] text-neutral-500'>
            Tap day for details
          </span>
        </div>
        <div className='grid grid-cols-3 gap-1.5'>
          {forecastStrip.map(d => (
            <button
              key={d.date}
              type='button'
              onClick={() => {
                jumpTo(d.date);
                setSelectedDate(d.date);
              }}
              className='rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-left transition hover:bg-neutral-100'
            >
              <p className='text-[9px] font-semibold text-neutral-700'>
                {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'short',
                })}
              </p>
              <p className='text-[10px] text-neutral-600'>
                {weatherEmoji(d.weatherCode)}{' '}
                {Math.round((d.tempMax + d.tempMin) / 2)}°
              </p>
              <p className='text-[9px] text-blue-700'>
                {d.precipitationSum.toFixed(1)} mm
              </p>
            </button>
          ))}
        </div>
      </div>

      {!showMoreWeatherInfo ? (
        <div className='relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 p-3 shadow-sm'>
          <div className='pointer-events-none absolute inset-0 backdrop-blur-[1px]' />
          <div className='pointer-events-none absolute -bottom-10 left-0 right-0 h-28 bg-gradient-to-t from-emerald-300/50 via-emerald-200/25 to-transparent blur-2xl' />

          <div className='relative pb-12'>
            <div className='mb-2 flex items-center gap-1.5'>
              <Sparkles className='h-4 w-4 text-emerald-700' />
              <h4 className='text-sm font-semibold text-neutral-900'>
                More Weather Info
              </h4>
            </div>

            <div className='grid grid-cols-2 gap-2 text-[11px]'>
              <div className='rounded-lg bg-sky-50 p-2'>
                <p className='text-sky-700'>Historical</p>
                <p className='font-semibold text-sky-900'>
                  {weatherCoverage.historical} days
                </p>
              </div>
              <div className='rounded-lg bg-indigo-50 p-2'>
                <p className='text-indigo-700'>Forecast</p>
                <p className='font-semibold text-indigo-900'>
                  {weatherCoverage.forecast} days
                </p>
              </div>
            </div>

            <div className='mt-2 space-y-1 text-[10px] text-neutral-700'>
              <p className='inline-flex items-center gap-1'>
                <Clock3 className='h-3 w-3' />
                Rain days:{' '}
                <span className='font-semibold'>{weatherCoverage.rainy}</span>
              </p>
              <p>
                Heavy rain:{' '}
                <span className='font-semibold'>
                  {weatherCoverage.heavyRain} days
                </span>
              </p>
              <div className='h-1.5 overflow-hidden rounded-full bg-neutral-100'>
                <div
                  className='h-full bg-sky-500 transition-all duration-500'
                  style={{
                    width: `${Math.min(100, (weatherCoverage.rainy / Math.max(1, availableDays.length)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/95 via-white/80 to-transparent backdrop-blur-[2px]' />
          </div>

          <button
            type='button'
            onClick={() => setShowMoreWeatherInfo(true)}
            className='absolute bottom-2.5 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full border border-emerald-200 bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-400/40 transition-colors hover:bg-emerald-500'
          >
            More info
            <ChevronRight className='ml-1.5 h-4 w-4' />
          </button>
        </div>
      ) : (
        <>
          <div className='flex justify-end -mt-1 mb-1'>
            <button
              type='button'
              onClick={() => setShowMoreWeatherInfo(false)}
              className='inline-flex items-center text-[11px] font-semibold text-neutral-600 hover:text-neutral-900'
            >
              Hide extra info
              <ChevronRight className='ml-1 h-3.5 w-3.5 rotate-90' />
            </button>
          </div>

          <div className='rounded-xl border border-neutral-200 bg-[linear-gradient(145deg,#f0fdf4_0%,#ffffff_55%,#ecfeff_100%)] p-3 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Sparkles className='h-4 w-4 text-emerald-700' />
                <h4 className='text-sm font-semibold text-neutral-900'>
                  More Weather Info
                </h4>
              </div>
              <span className='inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800'>
                {weekSummary.riskLevel} Risk
              </span>
            </div>

            <div className='grid grid-cols-2 gap-2 text-[11px]'>
              <div className='rounded-lg bg-sky-50 p-2'>
                <p className='text-sky-700'>Historical Coverage</p>
                <p className='font-semibold text-sky-900'>
                  {weatherCoverage.historical} days
                </p>
              </div>
              <div className='rounded-lg bg-indigo-50 p-2'>
                <p className='text-indigo-700'>Forecast Coverage</p>
                <p className='font-semibold text-indigo-900'>
                  {weatherCoverage.forecast} days
                </p>
              </div>
              <div className='rounded-lg bg-neutral-50 p-2'>
                <p className='text-neutral-500'>Unavailable</p>
                <p className='font-semibold text-neutral-900'>
                  {weatherCoverage.unavailable} days
                </p>
              </div>
              <div className='rounded-lg bg-neutral-50 p-2'>
                <p className='text-neutral-500'>Avg Wind</p>
                <p className='font-semibold text-neutral-900'>
                  {weekSummary.avgWind.toFixed(0)} km/h
                </p>
              </div>
            </div>

            <div className='mt-2'>
              <div className='mb-1 flex items-center justify-between text-[10px] text-neutral-600'>
                <span className='inline-flex items-center gap-1'>
                  <Clock3 className='h-3 w-3' /> Rainy-day intensity
                </span>
                <span className='font-semibold text-neutral-800'>
                  {weatherCoverage.rainy}/{Math.max(1, availableDays.length)}
                </span>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-neutral-100'>
                <div
                  className='h-full bg-emerald-500 transition-all duration-500'
                  style={{
                    width: `${Math.min(100, (weatherCoverage.rainy / Math.max(1, availableDays.length)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {monthStats && (
              <div className='mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px]'>
                <div className='rounded-md bg-blue-50 py-1 text-blue-800'>
                  <p className='font-semibold'>{monthStats.totalRain} mm</p>
                  <p>rain total</p>
                </div>
                <div className='rounded-md bg-emerald-50 py-1 text-emerald-800'>
                  <p className='font-semibold'>{monthStats.goodDays}</p>
                  <p>good days</p>
                </div>
                <div className='rounded-md bg-amber-50 py-1 text-amber-800'>
                  <p className='font-semibold'>{weatherCoverage.hotDays}</p>
                  <p>hot days</p>
                </div>
              </div>
            )}

            <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1'>
              <span className='inline-flex items-center gap-0.5 text-[10px] text-neutral-500'>
                <Calendar className='h-3 w-3' />
                Seasonal timeline
              </span>
              <span className='inline-flex items-center gap-0.5 text-[10px] text-neutral-500'>
                <History className='h-3 w-3' />
                Historical + Forecast blend
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
