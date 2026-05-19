import { HEALTH_STYLES, HEALTH_TRENDS } from '@/constants/sidebar';
import type { Farm, HeatmapData, MaskOverlay } from '@/types';

export type HealthLabel = keyof typeof HEALTH_STYLES;

export type HealthTrend = (typeof HEALTH_TRENDS[keyof typeof HEALTH_TRENDS]) | null;

export interface HealthTrendInfo {
  direction: HealthTrend;
  deltaPct: number;
  priorYearsCount: number;
}

export interface BandShare {
  spec: MaskOverlay;
  pct: number;
}

export interface FarmOverviewPanelProps {
  farm: Farm;
  heatmapData?: HeatmapData | null;
  canEdit: boolean;
  onDelete: () => void;
  onOpenTrends: () => void;
  onViewOnMap: () => void;
}
