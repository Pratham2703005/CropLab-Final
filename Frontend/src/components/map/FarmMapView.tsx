import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, ScaleControl } from 'react-leaflet';
import { Layers, ZoomIn, ZoomOut, RotateCcw, LocateFixed } from 'lucide-react';
import { useFarmMapView } from '@/hooks';
import { MAP_STYLES, MAPS } from '@/constants/map';

// Maximum allowed area in hectares (100 km² = 10,000 hectares)
// Fix for default markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FarmMapViewProps {
  coordinates: number[][]; // Array of [lng, lat] pairs
  farmName: string;
  height?: string;
  className?: string;
}

export const FarmMapView: React.FC<FarmMapViewProps> = ({
  coordinates,
  height = '400px',
  className = ''
}) => {
  const mapControls = useFarmMapView(coordinates);
  const { mapRef, mapStyle, showStyleSelector, toggleStyleSelector, handlers, center, zoom } = mapControls;

  return (
    <div className={`relative ${className}`} style={{zIndex:1}}>
      <div style={{ height }} className="w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={true}
          ref={mapRef}
        >
          {/* Base Layer - Dynamic based on selected style */}
          <TileLayer
            key={mapStyle}
            url={MAPS[mapStyle]}
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          />

          {/* Scale Control */}
          <ScaleControl position="bottomleft" imperial={false} />

          {/* Farm Boundary Polygon */}
          {mapControls.leafletCoords.length > 2 && (
            <Polygon
              positions={mapControls.leafletCoords}
              pathOptions={{
                color: '#10b981',
                weight: 3,
                fillOpacity: 0.2,
                fillColor: '#10b981'
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Left Side Controls Panel */}
      <div className="absolute top-3 left-3 z-[1000] bg-white backdrop-blur-sm rounded-md shadow-lg border border-neutral-700">
        <div className="p-2 space-y-1.5">
          {/* Navigation Tools */}
          <button
            type="button"
            onClick={handlers.handleZoomIn}
            className="w-8 h-8 bg-white text-black rounded-sm hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={handlers.handleZoomOut}
            className="w-8 h-8 bg-white text-black rounded-sm hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={handlers.handleResetView}
            className="w-8 h-8 bg-white text-black rounded-sm hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={handlers.handleLocateMe}
            className="w-8 h-8 bg-white text-black rounded-sm hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group"
            title="My Location"
          >
            <LocateFixed className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>

          {/* Divider */}
          <div className="h-px bg-neutral-600 my-2"></div>

          {/* Map Style Toggle */}
          <button
            type="button"
            onClick={toggleStyleSelector}
            className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all duration-200 group ${
              showStyleSelector 
                ? 'bg-gray-100 text-black' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
            title="Map Style"
          >
            <Layers className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Map Style Selector */}
        {showStyleSelector && (
          <div className="absolute left-full top-0 ml-2 bg-white rounded-md shadow-lg border border-neutral-700 py-1 min-w-[100px]">
            <button
              type="button"
              onClick={() => handlers.handleStyleChange(MAP_STYLES.HYBRID)}
              className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                mapStyle === MAP_STYLES.HYBRID 
                  ? 'bg-white text-black' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => handlers.handleStyleChange(MAP_STYLES.SATELLITE)}
              className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                mapStyle === MAP_STYLES.SATELLITE 
                  ? 'bg-white text-black' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => handlers.handleStyleChange(MAP_STYLES.STREETS)}
              className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                mapStyle === MAP_STYLES.STREETS 
                  ? 'bg-white text-black' 
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              Streets
            </button>
          </div>
        )}
      </div>
    </div>
  );
};