import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  LineChart as LineChartIcon,
  TrendingUp,
} from 'lucide-react';
import type {
  ChartType,
  HealthTrend,
  NDVITrendsPanelProps,
  NdviChartPoint,
} from '@/types';
import {
  CHART_TYPE,
  CHIP_STYLES,
  HEALTH_STYLES,
  HEALTH_TRENDS,
  NDVI_PANEL_COPY,
  PRIORITY_STYLES,
  TREND_STYLES,
} from '@/constants';
import {
  buildNdviChartData,
  computeHealthTrend,
  computeNdviDeltas,
  computeNdviStats,
  computeRiskScore,
  deriveActionItems,
  deriveAiPriority,
  deriveComparisonText,
  deriveHealthColor,
  deriveHealthTag,
  deriveImpactText,
  deriveInsightChips,
  deriveKeyIssueText,
  deriveMicroInsight,
  deriveOverallHealth,
  derivePixelPercents,
  deriveTopIssue,
  deriveTrendInsight,
  deriveTrendLabel,
  findExtremeDeltas,
  formatYearSpanArrow,
  formatYearSpanPrefix,
} from '@/utils/sidebar';

const NdviTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: NdviChartPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className='bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs'>
      <p className='font-semibold text-neutral-700'>{d.longLabel}</p>
      <p className='text-emerald-700 font-bold'>
        NDVI: {(d.ndvi as number).toFixed(4)}
      </p>
    </div>
  );
};

export const NDVITrendsPanel: React.FC<NDVITrendsPanelProps> = ({
  heatmapData,
  onViewStressMap,
}) => {
  const [chartType, setChartType] = React.useState<ChartType>(CHART_TYPE.LINE);
  const [showMoreInfo, setShowMoreInfo] = React.useState(false);

  // Backend returns up to 5 yearly NDVI points - same calendar date as the
  // current reference, sampled across the past 5 years. We render every
  // point we receive; there is no time-window filter anymore.
  const chartData = buildNdviChartData(heatmapData.anomaly?.ndvi_trend);

  // Compare latest NDVI against the average of all prior calendar-windowed years
  const { direction, deltaPct: changePct, priorYearsCount: yearsSpanned } =
    computeHealthTrend(heatmapData.anomaly?.ndvi_trend);
  const trendKey: HealthTrend = direction ?? HEALTH_TRENDS.STABLE;

  const trendLabel = deriveTrendLabel(trendKey);
  const trendInsight = deriveTrendInsight(trendKey, chartData.length);

  const latestNdviValue = chartData[chartData.length - 1]?.ndvi;
  const latestLabel = chartData[chartData.length - 1]?.longLabel;

  const healthTag = deriveHealthTag(latestNdviValue);

  const { stressedPercent, moderatePercent } = derivePixelPercents(
    heatmapData.pixel_counts
  );

  // Derive a top issue from pixel stats only (no fabricated diagnosis).
  const topIssue = deriveTopIssue(stressedPercent, moderatePercent);
  const keyIssueText = deriveKeyIssueText(topIssue, stressedPercent);

  const { pointCount, averageNdvi, volatility, recentDelta } =
    computeNdviStats(chartData);
  const { sharpestDrop, strongestRecovery } = findExtremeDeltas(
    computeNdviDeltas(chartData)
  );

  const microInsight = deriveMicroInsight(sharpestDrop, strongestRecovery);
  const impactText = deriveImpactText(trendKey, stressedPercent);
  const comparisonText = deriveComparisonText(yearsSpanned, chartData);

  // Risk score and overall health label come from the shared sidebar utils so
  // this panel and FarmInfoPanel always agree on the same farm.
  const riskScore = computeRiskScore(heatmapData.pixel_counts);
  const cropHealthScore = 100 - riskScore;

  const aiHealth = deriveOverallHealth(riskScore);
  const aiPriority = deriveAiPriority(cropHealthScore);
  const healthColor = deriveHealthColor(cropHealthScore);

  const hasHighStress = stressedPercent >= 35;
  const actionItems = deriveActionItems({ trendKey, hasHighStress, topIssue });
  const insightChips = deriveInsightChips({
    trendKey,
    sharpestDrop,
    strongestRecovery,
    volatility,
  });

  const hasAnomalyMap = Boolean(
    heatmapData.anomaly?.tile_urls?.anomaly_heatmap
  );

  return (
    <div className='space-y-2'>
      <div className='relative overflow-hidden rounded-xl border border-emerald-200 bg-[linear-gradient(130deg,#064e3b_0%,#065f46_35%,#10b981_100%)] p-2 text-white shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
        <div className='pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/20 blur-lg' />
        <div className='pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-emerald-300/25 blur-lg' />

        <div className='relative flex items-start justify-between gap-2'>
          <div>
            <p className='text-[10px] uppercase tracking-[0.14em] text-emerald-100'>
              {NDVI_PANEL_COPY.fieldHealth}
            </p>
            <div className='mt-0.5 flex items-center gap-0.5'>
              <span className='text-base font-bold leading-5'>
                {trendLabel}
              </span>
              {changePct >= 0 ? (
                <ArrowUpRight className='h-4 w-4 animate-bounce text-emerald-100' />
              ) : (
                <ArrowDownRight className='h-4 w-4 animate-bounce text-red-200' />
              )}
            </div>
            <p className='mt-0.5 text-[10px] leading-4 text-emerald-50'>
              {trendInsight}
            </p>
          </div>
          <span
            className={`rounded-full border bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold ${healthTag.style}`}
          >
            {healthTag.label}
          </span>
        </div>

        <div className='relative mt-1.5 grid grid-cols-3 gap-1'>
          <div className='rounded-md bg-white/15 px-1.5 py-1 backdrop-blur'>
            <p className='text-[9px] text-emerald-100'>{NDVI_PANEL_COPY.latestNdvi}</p>
            <p className='text-sm font-bold leading-4'>
              {typeof latestNdviValue === 'number'
                ? latestNdviValue.toFixed(4)
                : '--'}
            </p>
            <p className='truncate text-[9px] text-emerald-100'>
              {latestLabel ?? NDVI_PANEL_COPY.noDate}
            </p>
          </div>

          <div className='rounded-md bg-white/15 px-1.5 py-1 backdrop-blur'>
            <p className='text-[9px] text-emerald-100'>
              {yearsSpanned > 0
                ? NDVI_PANEL_COPY.yearChange(yearsSpanned)
                : NDVI_PANEL_COPY.yearlyChange}
            </p>
            <p className='text-sm font-bold leading-4'>
              {changePct >= 0 ? '+' : ''}
              {changePct.toFixed(1)}%
            </p>
            <p className='text-[9px] text-emerald-100'>
              {formatYearSpanArrow(chartData)}
            </p>
          </div>

          <div className='rounded-md bg-white/15 px-1.5 py-1 backdrop-blur'>
            <p className='text-[9px] text-emerald-100'>{NDVI_PANEL_COPY.stressArea}</p>
            <p className='text-sm font-bold leading-4'>
              {stressedPercent.toFixed(1)}%
            </p>
            <p className='text-[9px] text-emerald-100'>{NDVI_PANEL_COPY.underStress}</p>
          </div>
        </div>
      </div>

      <div className='rounded-xl border border-emerald-200 bg-[linear-gradient(145deg,#f0fdf4_0%,#ffffff_55%,#ecfeff_100%)] p-2 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
        <div className='mb-1 flex items-center justify-between gap-2'>
          <div className='flex items-center gap-1.5'>
            <TrendingUp className='h-4 w-4 text-emerald-700' />
            <h4 className='text-sm font-semibold text-neutral-900'>
              {NDVI_PANEL_COPY.ndviMomentum}
            </h4>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TREND_STYLES[trendKey]}`}
          >
            {trendLabel}
          </span>
        </div>

        <div className='mb-1 flex flex-wrap items-center justify-between gap-1.5'>
          <p className='text-[10px] text-neutral-600'>
            {NDVI_PANEL_COPY.sameCalendarSubtitle}
          </p>
          <div className='inline-flex rounded-lg border border-neutral-200 bg-white p-0.5'>
            <button
              type='button'
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                chartType === 'line'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <LineChartIcon className='h-2.5 w-2.5' />
              {NDVI_PANEL_COPY.lineButton}
            </button>
            <button
              type='button'
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                chartType === 'bar'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <BarChart3 className='h-2.5 w-2.5' />
              {NDVI_PANEL_COPY.barButton}
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className='bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-center'>
            <p className='text-xs text-neutral-500'>
              {NDVI_PANEL_COPY.noTrendData}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={116}>
            {chartType === 'line' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 2, right: 8, left: 4, bottom: -2 }}
              >
                <defs>
                  <linearGradient id='ndviGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#10b981' stopOpacity={0.78} />
                    <stop offset='95%' stopColor='#10b981' stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#dcfce7'
                  vertical={false}
                />
                <XAxis
                  dataKey='axisLabel'
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  interval='preserveStartEnd'
                  minTickGap={20}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={34}
                />
                <Tooltip content={<NdviTooltip />} />
                <Area
                  type='monotone'
                  dataKey='ndvi'
                  stroke='#059669'
                  strokeWidth={2.4}
                  fill='url(#ndviGradient)'
                />
                <Line
                  type='monotone'
                  dataKey='ndvi'
                  stroke='#059669'
                  strokeWidth={2.8}
                  dot={{ r: 2.5, fill: '#059669' }}
                  activeDot={{ r: 4.5 }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 2, right: 8, left: 4, bottom: -2 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#dcfce7'
                  vertical={false}
                />
                <XAxis
                  dataKey='axisLabel'
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  interval='preserveStartEnd'
                  minTickGap={20}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={34}
                />
                <Tooltip content={<NdviTooltip />} />
                <Bar
                  dataKey='ndvi'
                  radius={[4, 4, 0, 0]}
                  fill='#10b981'
                  maxBarSize={20}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}

        <div className='mt-1 flex flex-wrap gap-1'>
          {insightChips.map(chip => (
            <span
              key={chip.label}
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${CHIP_STYLES[chip.tone]}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <div className='rounded-xl border border-neutral-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] p-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
        <div className='mb-1 flex items-center justify-between'>
          <h4 className='text-xs font-semibold text-neutral-900'>
            {NDVI_PANEL_COPY.actionPriority}
          </h4>
          <span className='rounded-full border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700'>
            {NDVI_PANEL_COPY.aiActions}
          </span>
        </div>

        <div className='grid grid-cols-2 gap-1'>
          {actionItems.map((action, index) => (
            <div
              key={action.title}
              className={`rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 ${index === 0 ? 'col-span-2' : ''}`}
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='text-[11px] font-semibold text-neutral-900'>
                  {action.title}
                </p>
                <span
                  className={`rounded-full border px-1 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[action.priority]}`}
                >
                  {action.priority}
                </span>
              </div>
              <p className='mt-0.5 text-[10px] text-neutral-600'>
                {action.urgency}
              </p>
            </div>
          ))}
        </div>

      </div>

      {hasAnomalyMap && (
        <div className='group relative overflow-hidden rounded-lg border border-red-200 bg-red-50 p-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(239,68,68,0.22),transparent_46%),radial-gradient(circle_at_15%_80%,rgba(245,158,11,0.18),transparent_40%)]' />
          <div className='relative'>
            <div className='mb-1.5 h-12 overflow-hidden rounded-md border border-red-200 bg-[linear-gradient(120deg,#fee2e2_0%,#fecaca_35%,#fca5a5_70%,#fef2f2_100%)]'>
              <div className='flex h-full items-center justify-center bg-black/10 backdrop-blur-[1.5px]'>
                <p className='text-[9px] font-semibold tracking-wide text-red-900'>
                  {NDVI_PANEL_COPY.stressZonesDetected}
                </p>
              </div>
            </div>
            <div className='flex items-start gap-1'>
              <AlertTriangle className='mt-0.5 h-3 w-3 text-red-600' />
              <div className='min-w-0'>
                <p className='text-[10px] text-red-900'>
                  {NDVI_PANEL_COPY.hotspotsHint}
                </p>
              </div>
            </div>
            <div className='mt-1'>
              <button
                type='button'
                onClick={onViewStressMap}
                className='inline-flex items-center rounded-full border border-red-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-red-700 transition-colors hover:bg-red-100'
              >
                {NDVI_PANEL_COPY.inspectFieldHeatmap}
                <ChevronRight className='ml-0.5 h-3 w-3' />
              </button>
            </div>
          </div>
        </div>
      )}
      {!showMoreInfo && (
        <div className='relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-b from-white via-emerald-50/55 to-emerald-100/65 p-2 shadow-sm'>
          <div className='pointer-events-none absolute inset-0 backdrop-blur-[1px]' />
          <div className='pointer-events-none absolute -bottom-10 left-0 right-0 h-24 bg-gradient-to-t from-emerald-400/45 via-emerald-300/25 to-transparent blur-2xl' />
          <div className='pointer-events-none absolute -bottom-3 left-8 right-8 h-10 rounded-full bg-emerald-300/30 blur-xl' />

          <div className='relative pb-9'>
            <div className='relative overflow-hidden p-0.5'>
              <div className='mb-1.5 flex items-center justify-between gap-2'>
                <div className='inline-flex items-center gap-1'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100'>
                    <LineChartIcon className='h-3 w-3 text-slate-700' />
                  </span>
                  <h3 className='text-xs font-semibold text-neutral-900'>
                    {NDVI_PANEL_COPY.ndviDetails}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[aiPriority as 'High' | 'Medium' | 'Low']}`}
                >
                  {aiPriority}
                </span>
              </div>

              <div className='grid grid-cols-2 gap-1 text-[10px]'>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.overallHealth}</p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${HEALTH_STYLES[aiHealth] ?? HEALTH_STYLES.Moderate}`}
                  >
                    {aiHealth}
                  </span>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.cropHealthScore}</p>
                  <p className='text-sm font-bold text-neutral-900'>
                    {Math.round(cropHealthScore)}/100
                  </p>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.stressArea}</p>
                  <p className='font-semibold text-neutral-900'>
                    {stressedPercent.toFixed(1)}%
                  </p>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.moderateArea}</p>
                  <p className='font-semibold text-neutral-900'>
                    {moderatePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100'>
                <div
                  className={`h-full ${healthColor}`}
                  style={{ width: `${cropHealthScore}%` }}
                />
              </div>

              <div className='mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-neutral-700'>
                <p>{NDVI_PANEL_COPY.points}: {pointCount}</p>
                <p>{NDVI_PANEL_COPY.volatility}: {volatility.toFixed(3)}</p>
                <p>
                  {NDVI_PANEL_COPY.avgNdvi}:{' '}
                  {typeof averageNdvi === 'number'
                    ? averageNdvi.toFixed(3)
                    : '--'}
                </p>
                <p>
                  {NDVI_PANEL_COPY.latestMove}: {recentDelta >= 0 ? '+' : '-'}
                  {Math.abs(recentDelta).toFixed(3)}
                </p>
              </div>

              <div className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/95 via-white/80 to-transparent backdrop-blur-[2px]' />
            </div>
          </div>

          <button
            type='button'
            onClick={() => setShowMoreInfo(true)}
            className='absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-400/40 hover:bg-emerald-500 transition-colors'
          >
            {NDVI_PANEL_COPY.moreInfo}
            <ChevronRight className='ml-1.5 h-4 w-4' />
          </button>
        </div>
      )}
      {showMoreInfo && (
        <>
          <div className='flex justify-end -mt-1'>
            <button
              type='button'
              onClick={() => setShowMoreInfo(false)}
              className='inline-flex items-center text-[11px] font-semibold text-neutral-600 hover:text-neutral-900'
            >
              {NDVI_PANEL_COPY.hideExtraInfo}
              <ChevronRight className='ml-1 h-3.5 w-3.5 rotate-90' />
            </button>
          </div>
          <div className='space-y-2'>
            <div className='rounded-xl border border-neutral-200 bg-[linear-gradient(155deg,#ffffff_0%,#f8fafc_60%,#f1f5f9_100%)] p-2 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
              <div className='mb-1.5 flex items-center justify-between gap-2'>
                <div className='inline-flex items-center gap-1'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100'>
                    <LineChartIcon className='h-3 w-3 text-slate-700' />
                  </span>
                  <h3 className='text-xs font-semibold text-neutral-900'>
                    {NDVI_PANEL_COPY.ndviDetails}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[aiPriority as 'High' | 'Medium' | 'Low']}`}
                >
                  {aiPriority}
                </span>
              </div>

              <div className='grid grid-cols-2 gap-1 text-[10px]'>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.overallHealth}</p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${HEALTH_STYLES[aiHealth] ?? HEALTH_STYLES.Moderate}`}
                  >
                    {aiHealth}
                  </span>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.stressArea}</p>
                  <p className='font-semibold text-neutral-900'>
                    {stressedPercent.toFixed(1)}%
                  </p>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.cropHealthScore}</p>
                  <p className='font-semibold text-neutral-900'>
                    {Math.round(cropHealthScore)}/100
                  </p>
                </div>
                <div className='rounded-md border border-neutral-200 bg-neutral-50 p-1.5'>
                  <p className='text-neutral-500'>{NDVI_PANEL_COPY.moderateArea}</p>
                  <p className='font-semibold text-neutral-900'>
                    {moderatePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100'>
                <div
                  className={`h-full ${healthColor}`}
                  style={{ width: `${cropHealthScore}%` }}
                />
              </div>

              <div className='mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-neutral-700'>
                <p>{NDVI_PANEL_COPY.points}: {pointCount}</p>
                <p>{NDVI_PANEL_COPY.volatility}: {volatility.toFixed(3)}</p>
                <p>
                  {NDVI_PANEL_COPY.avgNdvi}:{' '}
                  {typeof averageNdvi === 'number'
                    ? averageNdvi.toFixed(3)
                    : '--'}
                </p>
                <p>
                  {NDVI_PANEL_COPY.latestMove}: {recentDelta >= 0 ? '+' : '-'}
                  {Math.abs(recentDelta).toFixed(3)}
                </p>
              </div>
            </div>

            <div className='rounded-xl border border-amber-200 bg-[linear-gradient(155deg,#fffbeb_0%,#fff7ed_45%,#ffffff_100%)] p-2 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
              <div className='mb-1 flex items-center justify-between'>
                <div className='inline-flex items-center gap-1'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-100'>
                    <AlertTriangle className='h-3 w-3 text-amber-700' />
                  </span>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-amber-700'>
                    {NDVI_PANEL_COPY.keyIssue}
                  </p>
                </div>
                {topIssue?.priority && (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY_STYLES[topIssue.priority]}`}
                  >
                    {topIssue.priority}
                  </span>
                )}
              </div>
              <p className='text-[10px] leading-4 text-amber-900'>
                {keyIssueText}
              </p>
              <p className='mt-1 rounded-md border border-amber-200/60 bg-white/80 px-1.5 py-1 text-[9px] leading-4 text-amber-800'>
                {NDVI_PANEL_COPY.whyItMattersLabel} {impactText}
              </p>
            </div>

            <div className='rounded-xl border border-neutral-200 bg-[linear-gradient(155deg,#ffffff_0%,#f8fafc_60%,#f1f5f9_100%)] p-2 shadow-sm transition-transform duration-300 hover:-translate-y-0.5'>
              <div className='mb-1 flex items-center justify-between'>
                <div className='inline-flex items-center gap-1'>
                  <span className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100'>
                    <TrendingUp className='h-3 w-3 text-emerald-700' />
                  </span>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-neutral-700'>
                    {NDVI_PANEL_COPY.smartSummary}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${TREND_STYLES[trendKey]}`}
                >
                  {trendLabel}
                </span>
              </div>
              <p className='text-[10px] leading-4 text-neutral-800'>
                {changePct >= 0 ? '↑' : '↓'} {changePct.toFixed(1)}%
                {formatYearSpanPrefix(chartData)}
                . {microInsight}
              </p>
              <p className='mt-1 rounded-md border border-neutral-200 bg-white/85 px-1.5 py-1 text-[9px] leading-4 text-neutral-600'>
                {comparisonText}
              </p>
            </div>
          </div>
        </>
      )}
      {!hasAnomalyMap && (
        <div className='rounded-lg border border-neutral-200 bg-neutral-50 p-1.5'>
          <p className='text-[10px] text-neutral-600'>
            {NDVI_PANEL_COPY.anomalyUnavailable}
          </p>
        </div>
      )}
    </div>
  );
};
