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
} as const;

export const TREND_STYLES = {
  improving: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  stable: 'bg-amber-100 text-amber-800 border-amber-200',
  declining: 'bg-red-100 text-red-800 border-red-200',
} as const;

export const CHIP_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
} as const;

export const PRIORITY_STYLES = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
} as const;

export const CHART_TYPE = {
  LINE: 'line',
  BAR: 'bar',
} as const;