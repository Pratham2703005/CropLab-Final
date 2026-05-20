import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft,
  Droplets,
  Thermometer,
  Wind,
  Sun,
} from 'lucide-react';
import type { DayWeather } from '@/types';
import {
  addDaysStr,
  conditionGradient,
  getRainInfo,
  getSuitability,
  weatherEmoji,
  weatherLabel,
} from '@/utils';
import { TempTooltip, RainTooltip } from '@/components/weather/WeatherTooltips';
import { AVAIL_BADGE, DAY_AVAILABILITY } from '@/constants';

interface DayDetailViewProps {
  day: DayWeather;
  allDays: Record<string, DayWeather>;
  onBack: () => void;
}

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  day,
  allDays,
  onBack,
}) => {
  const suitability = getSuitability(day);

  const badge = AVAIL_BADGE[day.availability] ?? AVAIL_BADGE[DAY_AVAILABILITY.HISTORICAL];

  const contextWindow = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysStr(day.date, i - 3);
      const d = allDays[dateStr];
      const label = new Date(`${dateStr}T00:00:00`).toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric' }
      );
      const isCurrent = dateStr === day.date;
      return d && d.availability !== DAY_AVAILABILITY.UNAVAILABLE
        ? {
            label,
            high: d.tempMax,
            low: d.tempMin,
            rain: d.precipitationSum,
            prob: d.precipitationProbability ?? 0,
            isCurrent,
          }
        : { label, high: null, low: null, rain: null, prob: null, isCurrent };
    }).filter(d => d.rain !== null);
  }, [day.date, allDays]);

  const rainInfo = getRainInfo(
    day.precipitationSum,
    day.precipitationProbability
  );
  const uvPercent = Math.min(100, (day.uvIndexMax / 12) * 100);
  const uvColor =
    day.uvIndexMax >= 8
      ? '#ef4444'
      : day.uvIndexMax >= 5
        ? '#f97316'
        : '#22c55e';
  const radialData = [{ value: uvPercent, fill: uvColor }];

  if (day.availability === DAY_AVAILABILITY.UNAVAILABLE) {
    return (
      <div className='overflow-hidden animate-in'>
        <div className='flex items-center space-x-2 pb-3 border-b border-neutral-100'>
          <button
            onClick={onBack}
            className='p-1 rounded-md hover:bg-neutral-100 transition-colors'
          >
            <ArrowLeft className='h-3.5 w-3.5 text-neutral-600' />
          </button>
          <span className='text-xs font-semibold text-neutral-700'>
            Back to Calendar
          </span>
        </div>
        <div className='py-8 text-center'>
          <div className='text-4xl mb-3'>🔮</div>
          <p className='text-sm font-semibold text-neutral-700 mb-1'>
            {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className='text-xs text-neutral-500'>
            Forecast not yet available.
          </p>
          <p className='text-[10px] text-neutral-400 mt-1'>
            Up to 16 days ahead supported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='overflow-hidden animate-in'>
      <div className='flex items-center space-x-2 pb-2 mb-3 border-b border-neutral-100'>
        <button
          onClick={onBack}
          className='flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          <span>Back</span>
        </button>
      </div>

      <div
        className={`bg-gradient-to-br ${conditionGradient(day.weatherCode)} px-3 py-3 text-white rounded-xl`}
      >
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1'>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.color} mb-1`}
            >
              {React.createElement(badge.icon, { className: 'h-3 w-3' })}
              <span>{badge.label}</span>
            </span>
            <p className='text-white/80 text-[10px]'>
              {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <div className='flex items-end gap-1'>
              <span className='text-3xl font-bold leading-none'>
                {Math.round(day.tempMax)}°
              </span>
              <span className='text-lg font-light text-white/70 mb-0.5'>
                / {Math.round(day.tempMin)}°
              </span>
            </div>
            <p className='text-white font-semibold text-sm mt-0.5'>
              {weatherLabel(day.weatherCode)}
            </p>
          </div>
          <span className='text-4xl leading-none flex-shrink-0'>
            {weatherEmoji(day.weatherCode)}
          </span>
        </div>

        <div className='mt-2 flex items-center gap-1.5 bg-white/20 rounded-lg px-2 py-1.5 backdrop-blur-sm'>
          <div
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${suitability.dot}`}
          />
          <span className='text-xs font-semibold text-white'>
            {suitability.label}
          </span>
        </div>
      </div>

      <div className='mt-3 space-y-3'>
        <div
          className={`rounded-xl border ${rainInfo.border} ${rainInfo.bg} p-3`}
        >
          <div className='flex items-start justify-between'>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-1 mb-0.5'>
                <Droplets className={`h-3.5 w-3.5 ${rainInfo.color}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${rainInfo.color}`}
                >
                  Rain
                </span>
              </div>
              <div className='flex items-baseline gap-1'>
                <span className='text-2xl font-bold text-neutral-900'>
                  {day.precipitationSum.toFixed(1)}
                </span>
                <span className='text-xs font-medium text-neutral-500'>mm</span>
              </div>
              {day.precipitationProbability !== null && (
                <div className='mt-1'>
                  <div className='flex items-center justify-between mb-0.5'>
                    <span className='text-[10px] text-neutral-500'>
                      Probability
                    </span>
                    <span className={`text-[10px] font-bold ${rainInfo.color}`}>
                      {day.precipitationProbability}%
                    </span>
                  </div>
                  <div className='w-full bg-white/60 rounded-full h-1.5 overflow-hidden'>
                    <div
                      className='h-1.5 rounded-full transition-all'
                      style={{
                        width: `${day.precipitationProbability}%`,
                        backgroundColor: rainInfo.barColor,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <span className='text-2xl leading-none flex-shrink-0 ml-2'>
              {rainInfo.emoji}
            </span>
          </div>
          <p className='text-[10px] text-neutral-500 italic mt-1.5'>
            {rainInfo.advice}
          </p>
        </div>

        {contextWindow.length >= 2 && (
          <div>
            <div className='flex items-center gap-1 mb-2'>
              <Droplets className='h-3.5 w-3.5 text-blue-500' />
              <h4 className='text-xs font-semibold text-neutral-800'>
                7-Day Rain
              </h4>
            </div>
            <ResponsiveContainer width='100%' height={100}>
              <BarChart
                data={contextWindow}
                margin={{ top: 4, right: 2, left: -24, bottom: 0 }}
                barSize={14}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#e0f2fe'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  unit='mm'
                />
                <Tooltip content={<RainTooltip />} />
                <ReferenceLine
                  y={5}
                  stroke='#f97316'
                  strokeDasharray='3 3'
                  strokeWidth={1}
                />
                <Bar dataKey='rain' name='rain' radius={[3, 3, 0, 0]}>
                  {contextWindow.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.isCurrent
                          ? '#1d4ed8'
                          : entry.rain !== null && (entry.rain as number) > 5
                            ? '#3b82f6'
                            : '#bfdbfe'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {contextWindow.some(d => (d.prob ?? 0) > 0) && (
              <>
                <p className='text-[10px] font-semibold text-sky-600 mt-2 mb-1'>
                  Rain Probability
                </p>
                <ResponsiveContainer width='100%' height={60}>
                  <AreaChart
                    data={contextWindow}
                    margin={{ top: 2, right: 2, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id='probGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop
                          offset='5%'
                          stopColor='#38bdf8'
                          stopOpacity={0.4}
                        />
                        <stop
                          offset='95%'
                          stopColor='#38bdf8'
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey='label'
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      unit='%'
                    />
                    <Tooltip content={<RainTooltip />} />
                    <Area
                      type='monotone'
                      dataKey='prob'
                      name='prob'
                      stroke='#0ea5e9'
                      strokeWidth={1.5}
                      fill='url(#probGrad)'
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      dot={(props: any) => {
                        const { cx = 0, cy = 0, payload } = props;
                        return (payload as { isCurrent: boolean }).isCurrent ? (
                          <circle
                            key={`pd-${cx}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill='#0ea5e9'
                            stroke='#fff'
                            strokeWidth={2}
                          />
                        ) : (
                          <circle
                            key={`p-${cx}`}
                            cx={cx}
                            cy={cy}
                            r={1.5}
                            fill='#0ea5e9'
                            stroke='none'
                          />
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        <div className='grid grid-cols-2 gap-2'>
          <div className='bg-teal-50 rounded-lg p-2.5'>
            <div className='flex items-center gap-1 mb-0.5'>
              <Wind className='h-3 w-3 text-teal-500' />
              <p className='text-[10px] text-neutral-500'>Wind</p>
            </div>
            <p className='font-bold text-neutral-800 text-sm'>
              {Math.round(day.windSpeedMax)}{' '}
              <span className='text-[10px] font-normal'>km/h</span>
            </p>
            <p className='text-[10px] text-teal-600'>
              {day.windSpeedMax > 35
                ? 'Strong'
                : day.windSpeedMax > 20
                  ? 'Moderate'
                  : 'Light'}
            </p>
          </div>
          <div className='bg-amber-50 rounded-lg p-2.5'>
            <div className='flex items-center gap-1 mb-0.5'>
              <Sun className='h-3 w-3 text-amber-500' />
              <p className='text-[10px] text-neutral-500'>UV Index</p>
            </div>
            <p className='font-bold text-neutral-800 text-sm'>
              {day.uvIndexMax.toFixed(1)}
            </p>
            <p
              className={`text-[10px] ${day.uvIndexMax >= 8 ? 'text-red-500' : day.uvIndexMax >= 5 ? 'text-orange-500' : 'text-green-600'}`}
            >
              {day.uvIndexMax >= 8
                ? 'Very High'
                : day.uvIndexMax >= 5
                  ? 'Moderate'
                  : 'Low'}
            </p>
          </div>
        </div>

        {contextWindow.length >= 3 && (
          <div>
            <div className='flex items-center gap-1 mb-2'>
              <Thermometer className='h-3.5 w-3.5 text-orange-500' />
              <h4 className='text-xs font-semibold text-neutral-800'>
                Temperature
              </h4>
            </div>
            <ResponsiveContainer width='100%' height={100}>
              <AreaChart
                data={contextWindow}
                margin={{ top: 4, right: 2, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='highGradCal' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#f97316' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#f97316' stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id='lowGradCal' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#38bdf8' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#38bdf8' stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#f0f0f0'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  unit='°'
                />
                <Tooltip content={<TempTooltip />} />
                <Area
                  type='monotone'
                  dataKey='high'
                  stroke='#f97316'
                  strokeWidth={1.5}
                  fill='url(#highGradCal)'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  dot={(props: any) => {
                    const { cx = 0, cy = 0, payload } = props;
                    return (payload as { isCurrent: boolean }).isCurrent ? (
                      <circle
                        key={`hd-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill='#f97316'
                        stroke='#fff'
                        strokeWidth={2}
                      />
                    ) : (
                      <circle
                        key={`h-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={2}
                        fill='#f97316'
                        stroke='none'
                      />
                    );
                  }}
                />
                <Area
                  type='monotone'
                  dataKey='low'
                  stroke='#38bdf8'
                  strokeWidth={1.5}
                  fill='url(#lowGradCal)'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  dot={(props: any) => {
                    const { cx = 0, cy = 0, payload } = props;
                    return (payload as { isCurrent: boolean }).isCurrent ? (
                      <circle
                        key={`ld-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill='#38bdf8'
                        stroke='#fff'
                        strokeWidth={2}
                      />
                    ) : (
                      <circle
                        key={`l-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={2}
                        fill='#38bdf8'
                        stroke='none'
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className='flex items-center justify-center gap-3 mt-1'>
              <span className='flex items-center gap-1 text-[10px] text-neutral-500'>
                <span className='inline-block w-2.5 h-0.5 bg-orange-500 rounded' />
                High
              </span>
              <span className='flex items-center gap-1 text-[10px] text-neutral-500'>
                <span className='inline-block w-2.5 h-0.5 bg-sky-400 rounded' />
                Low
              </span>
            </div>
          </div>
        )}

        <div className='grid grid-cols-2 gap-2'>
          <div className='bg-amber-50/60 rounded-xl p-2.5'>
            <p className='text-[10px] font-semibold text-neutral-600 mb-0.5 text-center'>
              UV Index
            </p>
            <div className='relative'>
              <ResponsiveContainer width='100%' height={70}>
                <RadialBarChart
                  innerRadius='60%'
                  outerRadius='100%'
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey='value'
                    cornerRadius={6}
                    background={{ fill: '#fef3c7' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className='absolute inset-0 flex flex-col items-center justify-end pb-1'>
                <p className='text-base font-bold text-neutral-800'>
                  {day.uvIndexMax.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-teal-50/60 rounded-xl p-2.5 flex flex-col justify-between'>
            <div className='flex items-center gap-1'>
              <Wind className='h-3.5 w-3.5 text-teal-600' />
              <p className='text-[10px] font-semibold text-neutral-600'>Wind</p>
            </div>
            <div>
              <p className='text-xl font-bold text-neutral-800'>
                {Math.round(day.windSpeedMax)}
                <span className='text-[10px] font-normal text-neutral-500'>
                  {' '}
                  km/h
                </span>
              </p>
              <div className='w-full bg-teal-100 rounded-full h-1.5 mt-1'>
                <div
                  className='bg-gradient-to-r from-teal-400 to-teal-600 h-1.5 rounded-full transition-all'
                  style={{
                    width: `${Math.min(100, (day.windSpeedMax / 80) * 100)}%`,
                  }}
                />
              </div>
              <div className='flex justify-between text-[9px] text-neutral-400 mt-0.5'>
                <span>Calm</span>
                <span>Storm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
