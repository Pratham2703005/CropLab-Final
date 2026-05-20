import { CHART_TYPE, CHIP_LABELS, HEALTH_STYLES, HEALTH_TRENDS, PRIORITY_LABELS } from '@/constants/sidebar';
import type { WeatherCalendarData } from '@/hooks/useWeatherCalendar';
import type { AgmarknetData, Farm, HeatmapData, MaskOverlay, WeatherData } from '@/types';
import type { LucideIcon } from 'lucide-react';

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

export interface MandiRatesPanelProps {
  agmarknet?: AgmarknetData | undefined;
  detectedDistrict?: string;
  aiAnalysis?: string;
}

export interface NDVITrendsPanelProps {
  heatmapData: HeatmapData;
  onViewStressMap?: () => void;
}

export type PriorityLabel = typeof PRIORITY_LABELS[keyof typeof PRIORITY_LABELS];

export type TrendStyle = typeof HEALTH_TRENDS[keyof typeof HEALTH_TRENDS];

export type ChipLabel = typeof CHIP_LABELS[keyof typeof CHIP_LABELS];

export type ChartType = typeof CHART_TYPE[keyof typeof CHART_TYPE];

// --- NDVI Trends panel ---

export interface NdviChartPoint {
  date: Date;
  ndvi: number;
  longLabel: string;
  axisLabel: string;
}

export interface NdviStats {
  pointCount: number;
  averageNdvi: number | null;
  variance: number;
  volatility: number;
  recentDelta: number;
}

export interface NdviDelta {
  date: Date;
  delta: number;
}

export interface ExtremeDeltas {
  sharpestDrop: NdviDelta | null;
  strongestRecovery: NdviDelta | null;
}

export interface PixelPercents {
  stressedPercent: number;
  moderatePercent: number;
}

export interface TopIssue {
  name: string;
  affected_area_pct: number;
  priority: PriorityLabel;
}

export interface ActionItem {
  title: string;
  priority: PriorityLabel;
  urgency: string;
}

export interface InsightChip {
  label: string;
  tone: ChipLabel;
}

export interface HealthTag {
  label: string;
  style: string;
}

// --- News panel ---

export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  start: number;
}

export type TabId = 'farm' | 'trends' | 'weather' | 'news' | 'mandi' | 'export';

export interface Tab {
  id: TabId;
  label: string;
  Icon: LucideIcon;
  activeColor: string;
  activeBg: string;
}

export interface SidebarTabsProps {
  farm: Farm;
  heatmapData?: HeatmapData | null;
  heatmapLoading?: boolean;
  weatherCalendarData?: WeatherCalendarData | null;
  canEdit: boolean;
  onDelete: () => void;
  onRefreshWeather: () => void;
  onExportData?: () => void;
  onGenerateReport?: () => void;
  onDownloadMap?: () => void;
  weatherLoading?: boolean;
  exportLoading?: boolean;
  onViewFarmOnMap?: () => void;
  onViewStressMap?: () => void;
}

export interface ExtendedWeatherData extends WeatherData {
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
}

export interface WeatherDataPanelProps {
  calendarData: WeatherData[];
  plantingDate?: string;
  harvestDate?: string;
  onRefresh: () => void;
  isLoading?: boolean;
}