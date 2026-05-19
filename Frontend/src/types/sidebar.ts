import { HEALTH_STYLES } from '@/constants/sidebar';
import type { Farm, HeatmapData, MaskOverlay } from '@/types';

export type HealthLabel = keyof typeof HEALTH_STYLES;

export type HealthTrend = 'improving' | 'stable' | 'declining' | null;

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