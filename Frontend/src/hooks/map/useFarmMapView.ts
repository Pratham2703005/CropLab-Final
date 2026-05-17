import { useState, useRef } from 'react';
import L from 'leaflet';
import type { MapStyle } from '@/types';
import { getPolygonCenter, getZoomLevel, toLeafletCoords } from '@/utils/map';
import { MAP_STYLES } from '@/constants/map';

/**
 * Hook that provides all necessary state, refs, and handlers for FarmMapView component
 * 
 * @param coordinates - Array of [lng, lat] coordinate pairs representing the farm boundary
 * @returns Object containing map control state, refs, computed values, and event handlers
 * 
 * @example
 * const mapControls = useFarmMapView(farm.coordinates);
 * // Use mapControls.mapRef, mapControls.mapStyle, mapControls.handlers, etc.
 */
export function useFarmMapView(coordinates: number[][]) {
  // State management
  const [mapStyle, setMapStyle] = useState<MapStyle>(MAP_STYLES.HYBRID);
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  // Map reference
  const mapRef = useRef<L.Map | null>(null);

  // Computed values from coordinates
  const leafletCoords: [number, number][] = toLeafletCoords(coordinates);
  const center = getPolygonCenter(leafletCoords);
  const zoom = getZoomLevel(leafletCoords);

  // Event handlers
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  };

  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, {
          animate: true,
          duration: 2, // seconds
        });
      },
      () => {
        // Ignore geolocation errors silently
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStyleChange = (style: MapStyle) => {
    setMapStyle(style);
    setShowStyleSelector(false);
  };

  const toggleStyleSelector = () => {
    setShowStyleSelector((prev) => !prev);
  };

  return {
    // State
    mapStyle,
    showStyleSelector,

    // Refs
    mapRef,

    // Computed values
    leafletCoords,
    center,
    zoom,

    // Handlers
    handlers: {
      handleZoomIn,
      handleZoomOut,
      handleResetView,
      handleLocateMe,
      handleStyleChange,
    },
    toggleStyleSelector,
  };
}
