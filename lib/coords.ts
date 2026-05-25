
export const MAP_BOUNDS = {
  minLat: -17.85,
  maxLat: -17.80,
  minLng: 31.02,
  maxLng: 31.08,
};

export function pctToLatLng(x: number, y: number) {
  const lng = MAP_BOUNDS.minLng + (x / 100) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  // y=0 is top (maxLat), y=100 is bottom (minLat)
  const lat = MAP_BOUNDS.maxLat - (y / 100) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return { latitude: lat, longitude: lng };
}

export function latLngToPct(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return { x, y };
}
