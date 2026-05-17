import type { MAP_STYLES } from "@/constants/map";
import type { HeatmapData, MapMaskMode, MasksViewMode } from "./farm";

export type MapStyle = 
  (typeof MAP_STYLES)[keyof typeof MAP_STYLES];

export interface MapState {
  center: [number, number];
  zoom: number;
  selectedLayer: MapStyle;
  drawnShapes: GeoJSON.Feature[];
  overlays: HealthOverlay[];
  isDrawing: boolean;
}

export interface HealthOverlay {
  id: string;
  type: 'ndvi' | 'stress' | 'pest-risk' | 'irrigation';
  imageUrl: string;
  bounds: [[number, number], [number, number]];
  opacity: number;
  timestamp: string;
  farmId?: string;
}

export interface DrawingTool {
  type: 'rectangle' | 'polygon' | 'marker';
  isActive: boolean;
}

export interface MapControls {
  showLayerControl: boolean;
  showDrawingTools: boolean;
  showLocationSearch: boolean;
  showFullscreenControl: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
  bounds?: MapBounds;
}

export interface HeatmapOverlayProps {
  coordinates: number[][]; // Array of [lng, lat] pairs
  heatmapData?: HeatmapData | null;
  height?: string;
  className?: string;
  activeLayer?: MapMaskMode;
  onLayerChange?: (layer: MapMaskMode) => void;
  maskOpacity?: Record<string, number>; // Individual mask opacity: { red: 0.7, yellow: 0.6, ... }
  maskVisibility?: Record<string, boolean>; // Individual mask visibility: { red: true, yellow: false, ... }
  anomalyTileUrl?: string | undefined; // Tile URL for anomaly map
  focusRequestId?: number;
  viewMode?: MasksViewMode; // 'masks' shows discrete colors, 'range' shows gradient
  rangeOpacity?: number; // 0-1, only used in range mode
}

export interface MaskOverlay {
  id: string;
  name: string;
  color: string;
  base64Data: string;
  opacity: number;
  visible: boolean;
}