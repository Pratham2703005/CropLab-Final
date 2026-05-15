import React, { useMemo, useState, useEffect } from 'react';
import { Store, Sparkles } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AgmarknetData } from '@/types/farm';

interface MandiRatesPanelProps {
  agmarknet?: AgmarknetData | undefined;
  detectedDistrict?: string;
  aiAnalysis?: string;
}

type Unit = 'quintal' | 'kg';

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const parsePriceKey = (key: string): readonly [number, number] => {
  const parts = key.replace('prices_', '').split('_');
  const year = parseInt(parts[parts.length - 1] ?? '0', 10);
  const monthIdx = MONTH_NAMES.indexOf(
    (parts[0] ?? '').toLowerCase() as (typeof MONTH_NAMES)[number]
  );
  return [year, monthIdx + 1] as const;
};

const formatPriceKey = (key: string): string => {
  const parts = key.replace('prices_', '').split('_');
  const monthShort = (parts[0] ?? '').slice(0, 3);
  const monthLabel =
    monthShort.charAt(0).toUpperCase() + monthShort.slice(1).toLowerCase();
  const year = parts[parts.length - 1] ?? '';
  return `${monthLabel} ${year.slice(2)}`;
};

export const MandiRatesPanel: React.FC<MandiRatesPanelProps> = ({
  agmarknet,
  detectedDistrict,
  aiAnalysis,
}) => {
  const [district, setDistrict] = useState<string>('');
  const [unit, setUnit] = useState<Unit>('quintal');
  const [districtInitialized, setDistrictInitialized] = useState(false);

  const districts = useMemo(() => {
    if (!agmarknet?.rows || !Array.isArray(agmarknet.rows)) return [];
    const set = new Set<string>();
    agmarknet.rows.forEach(row => {
      const d = row.district;
      if (typeof d === 'string' && d.trim()) set.add(d.trim());
    });
    return Array.from(set).sort();
  }, [agmarknet]);

  // Initialize selection: prefer the backend-detected district (case-insensitive
  // match against the available list), otherwise the first alphabetically.
  useEffect(() => {
    if (districtInitialized || districts.length === 0 || district) return;
    let initial: string | undefined;
    if (detectedDistrict) {
      const target = detectedDistrict.trim().toLowerCase();
      initial = districts.find(d => d.toLowerCase() === target);
    }
    if (!initial) initial = districts[0];
    if (initial) {
      setDistrict(initial);
      setDistrictInitialized(true);
    }
  }, [districtInitialized, districts, district, detectedDistrict]);

  const unitLabel = unit === 'kg' ? '₹/kg' : '₹/qn';
  const normalizedAiAnalysis = aiAnalysis?.trim();

  const hasData =
    agmarknet?.success && agmarknet.rows && agmarknet.rows.length > 0;

  if (!hasData && !normalizedAiAnalysis) {
    return (
      <div className='flex flex-col items-center justify-center py-8 text-center'>
        <Store className='h-12 w-12 text-neutral-300 mb-3' />
        <p className='text-sm text-neutral-600'>No mandi rate data available</p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {normalizedAiAnalysis && (
        <div className='rounded-lg border border-rose-200 bg-rose-50 p-3'>
          <div className='flex items-center gap-1.5'>
            <Sparkles className='h-3.5 w-3.5 text-rose-700' />
            <p className='text-[11px] font-semibold uppercase tracking-wide text-rose-700'>
              AI Mandi Analysis
            </p>
          </div>
          <p className='mt-1 text-xs leading-relaxed text-rose-900'>
            {normalizedAiAnalysis}
          </p>
        </div>
      )}

      {hasData && (
        <div className='space-y-3'>
          {/* District selector */}
          <div>
            <label className='block text-xs font-medium text-neutral-700 mb-1'>
              District
              {detectedDistrict && (
                <span className='ml-2 text-[10px] text-primary-600 font-normal'>
                  (auto-detected: {detectedDistrict})
                </span>
              )}
            </label>
            <select
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className='w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400'
            >
              {districts.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Unit toggle */}
          <div>
            <label className='block text-xs font-medium text-neutral-700 mb-1'>
              Unit
            </label>
            <div className='inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50'>
              <button
                onClick={() => setUnit('quintal')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  unit === 'quintal'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ₹ / quintal
              </button>
              <button
                onClick={() => setUnit('kg')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  unit === 'kg'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ₹ / kg
              </button>
            </div>
          </div>

          {/* 6-month trend chart: district vs state average */}
          {district && (
            <div className='border border-neutral-200 rounded-lg p-2 bg-white'>
              <div className='flex items-center justify-between mb-1.5 px-1'>
                <div className='text-xs font-semibold text-neutral-900'>
                  {district} — 6-month wholesale price trend
                </div>
                <div className='text-[10px] text-neutral-500'>{unitLabel}</div>
              </div>
              {(() => {
                const districtData = (
                  agmarknet!.rows as Array<
                    Record<string, string | number | null>
                  >
                ).find(row => row.district === district);
                if (!districtData) {
                  return (
                    <div className='py-4 text-center text-sm text-neutral-500'>
                      No data available for {district}
                    </div>
                  );
                }
                const divisor = unit === 'kg' ? 100 : 1;
                const stateAvg = agmarknet?.average;
                const priceKeys = Object.keys(districtData)
                  .filter(key => key.startsWith('prices_'))
                  .sort((a, b) => {
                    const [ay, am] = parsePriceKey(a);
                    const [by, bm] = parsePriceKey(b);
                    return ay - by || am - bm;
                  });

                const chartData = priceKeys
                  .map(key => {
                    const districtPrice = districtData[key];
                    const avgPrice = stateAvg?.[key];
                    return {
                      month: formatPriceKey(key),
                      key,
                      district:
                        typeof districtPrice === 'number'
                          ? +(districtPrice / divisor).toFixed(2)
                          : null,
                      stateAverage:
                        typeof avgPrice === 'number'
                          ? +(avgPrice / divisor).toFixed(2)
                          : null,
                    };
                  })
                  .filter(d => d.district !== null);

                if (chartData.length === 0) {
                  return (
                    <div className='py-4 text-center text-sm text-neutral-500'>
                      No price data available.
                    </div>
                  );
                }

                const latest = chartData[chartData.length - 1];
                const districtVsAvg =
                  latest?.district != null && latest?.stateAverage != null
                    ? +(latest.district - latest.stateAverage).toFixed(2)
                    : null;

                return (
                  <>
                    <ResponsiveContainer width='100%' height={220}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                        <XAxis dataKey='month' tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8 }}
                          formatter={v => {
                            const value =
                              typeof v === 'number'
                                ? v
                                : typeof v === 'string'
                                  ? parseFloat(v)
                                  : 0;
                            return Number.isNaN(value)
                              ? 'N/A'
                              : `${value} ${unitLabel}`;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line
                          type='monotone'
                          dataKey='district'
                          name={district}
                          stroke='#10b981'
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        {stateAvg && (
                          <Line
                            type='monotone'
                            dataKey='stateAverage'
                            name='State average'
                            stroke='#94a3b8'
                            strokeWidth={1.5}
                            strokeDasharray='4 4'
                            dot={{ r: 2 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className='text-[10px] text-neutral-600 mt-2 px-1 space-y-0.5'>
                      <div>
                        <span className='font-medium'>
                          Month-over-month change:
                        </span>{' '}
                        {districtData.change_over_previous_month ?? 'N/A'}%
                      </div>
                      <div>
                        <span className='font-medium'>
                          Year-over-year change:
                        </span>{' '}
                        {districtData.change_over_previous_year ?? 'N/A'}%
                      </div>
                      {districtVsAvg != null && (
                        <div>
                          <span className='font-medium'>
                            Latest vs state average:
                          </span>{' '}
                          <span
                            className={
                              districtVsAvg >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {districtVsAvg >= 0 ? '+' : ''}
                            {districtVsAvg} {unitLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
