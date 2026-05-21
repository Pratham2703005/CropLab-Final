import type { Tab } from '@/types';
import {
  Home,
  TrendingUp,
  Cloud,
  Download,
  Newspaper,
  Store,
} from 'lucide-react';

export const HEALTH_STYLES = {
  Excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Good: 'bg-lime-100 text-lime-800 border-lime-200',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  Poor: 'bg-orange-100 text-orange-800 border-orange-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
};

export const HEALTH_TRENDS = {
  // 'improving' | 'stable' | 'declining'
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining'
} as const;

export const PRIORITY_LABELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export const CHIP_LABELS = {
  EMERALD: 'emerald',
  AMBER: 'amber',
  RED: 'red',
  SKY: 'sky',
  ORANGE: 'orange',
  SLATE: 'slate',
} as const;

export const TREND_STYLES = {
  improving: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  stable: 'bg-amber-100 text-amber-800 border-amber-200',
  declining: 'bg-red-100 text-red-800 border-red-200',
} as const;

export const CHIP_STYLES = {
  [CHIP_LABELS.EMERALD]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [CHIP_LABELS.AMBER]: 'bg-amber-100 text-amber-800 border-amber-200',
  [CHIP_LABELS.RED]: 'bg-red-100 text-red-800 border-red-200',
  [CHIP_LABELS.SKY]: 'bg-sky-100 text-sky-800 border-sky-200',
} as const;

export const PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export const PRIORITY_STYLES = {
  [PRIORITY.HIGH]: 'bg-red-100 text-red-800 border-red-200',
  [PRIORITY.MEDIUM]: 'bg-amber-100 text-amber-800 border-amber-200',
  [PRIORITY.LOW]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
} as const;

export const CHART_TYPE = {
  LINE: 'line',
  BAR: 'bar',
} as const;

// --- NDVI Trends panel copy ---

/**
 * Per-trend label + insight sentence used by the NDVI Momentum card.
 * The `insufficient` fallback (data not yet ready) lives in `NDVI_PANEL_COPY`
 * since it isn't tied to a specific trend direction.
 */
export const NDVI_TREND_META = {
  improving: {
    label: 'Improving',
    insight: 'NDVI for this calendar window has been climbing year-over-year.',
  },
  stable: {
    label: 'Stable',
    insight:
      'NDVI for this calendar window has held roughly steady year-over-year.',
  },
  declining: {
    label: 'Declining',
    insight:
      'NDVI for this calendar window has fallen across the past few seasons.',
  },
} as const;

export const NDVI_HEALTH_TAGS = {
  healthy: {
    label: 'Healthy',
    style: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  moderate: {
    label: 'Moderate',
    style: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  stressed: {
    label: 'Stressed',
    style: 'bg-red-100 text-red-800 border-red-200',
  },
  unknown: {
    label: 'Unknown',
    style: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  },
} as const;

export const NDVI_TOP_ISSUE_LABELS = {
  STRESSED: 'Stressed area',
  MODERATE: 'Moderate-health area',
} as const;

export const NDVI_KEY_ISSUE_TEXT = {
  noStress: 'No major stress cluster detected in the pixel breakdown.',
  highStress: (pct: number) =>
    `${pct.toFixed(1)}% of the field currently appears stressed.`,
  topIssue: (pct: number, name: string) =>
    `${pct.toFixed(1)}% of field is ${name.toLowerCase()}.`,
} as const;

export const NDVI_MICRO_INSIGHT_TEXT = {
  noSwings: 'No sharp year-over-year NDVI swings in the 5-year window.',
  drop: (formattedDate: string) =>
    `Sharpest drop landed in ${formattedDate}.`,
  recovery: (formattedDate: string) =>
    `Strongest recovery landed in ${formattedDate}.`,
} as const;

export const NDVI_IMPACT_TEXT = {
  decliningWidespread:
    'Stress is widespread; targeted scouting and irrigation review can stop further spread.',
  declining:
    'Decline detected; check water distribution and nutrient uptake in weaker zones.',
  improving: 'Recovery underway; stable irrigation can preserve this momentum.',
  stable:
    'Stable health now; targeted scouting can prevent sudden stress spread.',
} as const;

export const NDVI_COMPARISON_TEXT = {
  insufficient: 'Need NDVI from at least two years to compare.',
  withYears: (n: number) =>
    `Latest vs average of ${n} prior year${n === 1 ? '' : 's'}.`,
} as const;

export const NDVI_ACTIONS = {
  irrigation: {
    high: { title: 'Irrigation Required', urgency: 'Do within 24-48h' },
    normal: {
      title: 'Irrigation Uniformity Check',
      urgency: 'Do within 3-5 days',
    },
  },
  topIssue: {
    fallbackTitle: 'Nitrogen Boost',
    controlSuffix: ' Control',
    urgencyImmediate: 'Immediate',
    urgencyNormal: 'Within 3-5 days',
  },
  scouting: {
    high: { title: 'Inspect Stress Zones', urgency: 'Immediate' },
    normal: { title: 'Targeted Field Scouting', urgency: 'Within 48h' },
  },
} as const;

export const NDVI_INSIGHT_CHIPS = {
  STABLE_GROWTH: { label: 'Stable Growth', tone: CHIP_LABELS.EMERALD },
  SUDDEN_DROP: { label: 'Sudden Drop Detected', tone: CHIP_LABELS.RED },
  RECOVERY: { label: 'Recovery Signal', tone: CHIP_LABELS.SKY },
  HIGH_VARIABILITY: { label: 'High Variability', tone: CHIP_LABELS.AMBER },
  CONSISTENT: { label: 'Consistent Canopy', tone: CHIP_LABELS.EMERALD },
  STEADY: { label: 'Steady Pattern', tone: CHIP_LABELS.AMBER },
} as const;

export const NDVI_PANEL_COPY = {
  fieldHealth: 'Field Health',
  ndviMomentum: 'NDVI Momentum',
  sameCalendarSubtitle: 'Same-calendar NDVI, last 5 years',
  actionPriority: 'Action Priority',
  aiActions: 'AI Actions',
  ndviDetails: 'NDVI Details',
  overallHealth: 'Overall Health',
  cropHealthScore: 'Crop Health Score',
  stressArea: 'Stress Area',
  moderateArea: 'Moderate Area',
  latestNdvi: 'Latest NDVI',
  noDate: 'No date',
  underStress: 'under stress',
  yearlyChange: 'Yearly change',
  yearChange: (n: number) => `${n}-yr change`,
  sameCalendarWindow: 'same calendar window',
  noTrendData: 'NDVI trend data is not available for this farm yet.',
  stressZonesDetected: 'STRESS ZONES DETECTED',
  hotspotsHint:
    'Hotspots are visible in anomaly mapping. Inspect these regions before the next irrigation cycle.',
  inspectFieldHeatmap: 'Inspect field heatmap',
  anomalyUnavailable:
    'Anomaly stress layer is unavailable for this farm right now.',
  moreInfo: 'More info',
  hideExtraInfo: 'Hide extra info',
  keyIssue: 'Key Issue',
  whyItMattersLabel: 'Why it matters:',
  smartSummary: 'Smart Summary',
  lineButton: 'Line',
  barButton: 'Bar',
  points: 'Points',
  volatility: 'Volatility',
  avgNdvi: 'Avg NDVI',
  latestMove: 'Latest move',
  fromYearToYear: (from: number, to: number) => ` from ${from} to ${to}`,
  acrossAvailableYears: ' across the available years',
  insufficientTrendInsight:
    'Not enough yearly NDVI points yet for a reliable signal.',
} as const;

// --- News panel copy ---

/** How many news items fit on one page of the news list. */
export const NEWS_PAGE_SIZE = 10;

export const NEWS_PANEL_COPY = {
  noNewsAvailable: 'No news available',
  aiAnalysisLabel: 'AI News Analysis',
  searchPlaceholder: 'Search by title or source…',
  resultCount: (n: number) => `${n} result${n === 1 ? '' : 's'}`,
  resultsForQuery: (q: string) => `for "${q}"`,
  noMatches: 'No news matches your search.',
  pageLabel: 'Page',
  pageOf: (total: number) => `of ${total}`,
  prevButton: 'Prev',
  nextButton: 'Next',
} as const;

/**
 * Sidebar tabs keyed by stable enum-style names so callers can reference a
 * specific tab directly (e.g. `TABS.FARM`) without an array index or `.find`.
 * For iteration (the icon strip, tab lookups by id), use `TAB_LIST` below —
 * `Object.values(TABS)` preserves the declaration order in modern engines.
 */
export const TABS = {
  FARM: {
    id: 'farm',
    label: 'Overview',
    Icon: Home,
    activeColor: 'text-primary-600',
    activeBg: 'bg-primary-50',
  },
  TRENDS: {
    id: 'trends',
    label: 'NDVI Trends',
    Icon: TrendingUp,
    activeColor: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
  },
  WEATHER: {
    id: 'weather',
    label: 'Weather',
    Icon: Cloud,
    activeColor: 'text-sky-600',
    activeBg: 'bg-sky-50',
  },
  NEWS: {
    id: 'news',
    label: 'News',
    Icon: Newspaper,
    activeColor: 'text-orange-600',
    activeBg: 'bg-orange-50',
  },
  MANDI: {
    id: 'mandi',
    label: 'Mandi Rates',
    Icon: Store,
    activeColor: 'text-rose-600',
    activeBg: 'bg-rose-50',
  },
  EXPORT: {
    id: 'export',
    label: 'Export',
    Icon: Download,
    activeColor: 'text-amber-600',
    activeBg: 'bg-amber-50',
  },
} as const satisfies Record<string, Tab>;

export const TAB_LIST: readonly Tab[] = Object.values(TABS);

export const DEFAULT_SIDEBAR = {
  MIN_WIDTH: 280,
  MAX_WIDTH: 640,
  DEFAULT_WIDTH: 350,
}

export const BUTTON_CLASSES = {
  [CHIP_LABELS.AMBER]: 'border-amber-300 text-amber-800 hover:bg-amber-100',
  [CHIP_LABELS.ORANGE]: 'border-orange-300 text-orange-800 hover:bg-orange-100',
  [CHIP_LABELS.RED]: 'border-red-300 text-red-700 hover:bg-red-100',
  [CHIP_LABELS.SLATE]: 'border-slate-300 text-slate-700 hover:bg-slate-100',
}

export const TONE_CLASSES = {
  [CHIP_LABELS.AMBER]: 'border-amber-200 bg-amber-50 text-amber-800',
  [CHIP_LABELS.ORANGE]: 'border-orange-200 bg-orange-50 text-orange-800',
  [CHIP_LABELS.RED]: 'border-red-200 bg-red-50 text-red-800',
  [CHIP_LABELS.SLATE]: 'border-slate-200 bg-slate-50 text-slate-700',
};