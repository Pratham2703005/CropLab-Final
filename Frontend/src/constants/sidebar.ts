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