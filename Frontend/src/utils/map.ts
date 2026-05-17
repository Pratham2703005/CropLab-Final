/**
 * Calculates the center point (centroid) of a polygon defined by coordinates
 * @param coordinates - Array of [lat, lng] pairs
 * @returns [lat, lng] tuple representing the center point
 */
export const getPolygonCenter = (coordinates: [number, number][]): [number, number] => {
  if (!coordinates || coordinates.length === 0) {
    return [28.6139, 77.2090]; // Default center (Delhi, India)
  }

  const latSum = coordinates.reduce((sum: number, coord: [number, number]) => sum + coord[0], 0);
  const lngSum = coordinates.reduce((sum: number, coord: [number, number]) => sum + coord[1], 0);

  return [latSum / coordinates.length, lngSum / coordinates.length];
};

/**
 * Converts raw coordinate pairs in [lng, lat] order to Leaflet's [lat, lng] order.
 * Invalid entries (non-arrays, too short, non-numeric) are filtered out.
 * @param coordinates - Array of [lng, lat] pairs (untrusted shape)
 * @returns Array of [lat, lng] pairs suitable for Leaflet
 */
export const toLeafletCoords = (coordinates: number[][]): [number, number][] => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter(
      (coord): coord is [number, number] =>
        Array.isArray(coord) &&
        coord.length >= 2 &&
        typeof coord[0] === 'number' &&
        typeof coord[1] === 'number'
    )
    .map((coord) => [coord[1], coord[0]]);
};

/**
 * Calculates an appropriate Leaflet zoom level based on the bounds of a polygon.
 * @param coordinates - Array of [lat, lng] pairs
 * @returns A zoom level between 8 and 14
 */
export const getZoomLevel = (coordinates: [number, number][]): number => {
  if (!coordinates || coordinates.length === 0) {
    return 10;
  }

  const lats = coordinates.map((coord: [number, number]) => coord[0]);
  const lngs = coordinates.map((coord: [number, number]) => coord[1]);
  const latRange = Math.max(...lats) - Math.min(...lats);
  const lngRange = Math.max(...lngs) - Math.min(...lngs);
  const maxRange = Math.max(latRange, lngRange);

  // Rough zoom calculation
  if (maxRange > 1) return 8;
  if (maxRange > 0.1) return 10;
  if (maxRange > 0.01) return 12;
  return 14;
};
