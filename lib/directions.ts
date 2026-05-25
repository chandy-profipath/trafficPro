/**
 * Google Directions API integration for TrafficPro.
 * Geocodes origin/destination place names, fetches a real driving route,
 * decodes the encoded polyline, and returns lat/lng coordinates.
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface RouteResult {
  /** Array of lat/lng points forming the route polyline */
  coordinates: { latitude: number; longitude: number }[];
  /** Total distance text, e.g. "12.4 km" */
  distanceText: string;
  /** Total distance in meters */
  distanceMeters: number;
  /** Total duration text, e.g. "18 mins" */
  durationText: string;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Start address as returned by Google */
  startAddress: string;
  /** End address as returned by Google */
  endAddress: string;
  /** Start coordinate */
  startLocation: { latitude: number; longitude: number };
  /** End coordinate */
  endLocation: { latitude: number; longitude: number };
  /** Turn-by-turn navigation steps */
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;         // HTML instruction text
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  maneuver?: string;           // e.g. 'turn-left', 'turn-right'
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
}

/**
 * Decode an encoded polyline string into an array of lat/lng pairs.
 * Algorithm from: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Strip basic HTML tags from Google's instruction text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Fetch a real driving route between two places using Google Routes API (v2).
 * Places can be addresses, place names, or "lat,lng" strings.
 */
export async function fetchRoute(origin: string, destination: string): Promise<RouteResult> {
  if (!API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

  console.log('[Directions] Fetching route (Routes API):', origin, '→', destination);

  const parseWaypoint = (wp: string) => {
    const parts = wp.split(',');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return {
        location: {
          latLng: {
            latitude: Number(parts[0]),
            longitude: Number(parts[1])
          }
        }
      };
    }
    return { address: wp };
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
    },
    body: JSON.stringify({
      origin: parseWaypoint(origin),
      destination: parseWaypoint(destination),
      travelMode: 'DRIVE'
    })
  });

  const json = await res.json();

  if (json.error) {
    console.error('[Directions] API error:', json.error.status, json.error.message || '');
    throw new Error(`Routes API error: ${json.error.status} — ${json.error.message || 'No route found'}`);
  }

  if (!json.routes || json.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = json.routes[0];
  const leg = route.legs && route.legs.length > 0 ? route.legs[0] : null;

  // Decode the overview polyline for the full route path
  const encodedPolyline = route.polyline?.encodedPolyline || '';
  const coordinates = decodePolyline(encodedPolyline);

  // Parse turn-by-turn steps
  const steps: RouteStep[] = [];
  if (leg && leg.steps) {
    for (const step of leg.steps) {
      steps.push({
        instruction: step.navigationInstruction?.instructions || '',
        distanceText: `${step.distanceMeters} m`,
        distanceMeters: step.distanceMeters || 0,
        durationText: step.staticDuration || '',
        maneuver: step.navigationInstruction?.maneuver || undefined,
        startLocation: {
          latitude: step.startLocation?.latLng?.latitude || 0,
          longitude: step.startLocation?.latLng?.longitude || 0,
        },
        endLocation: {
          latitude: step.endLocation?.latLng?.latitude || 0,
          longitude: step.endLocation?.latLng?.longitude || 0,
        },
      });
    }
  }

  // Format distance
  const distanceKm = (route.distanceMeters / 1000).toFixed(1);
  const distanceText = `${distanceKm} km`;

  // Format duration (e.g., "1800s" -> 30 mins)
  const durationSeconds = parseInt((route.duration || '0').replace('s', ''));
  const durationMins = Math.ceil(durationSeconds / 60);
  const durationText = durationMins >= 60 ? `${Math.floor(durationMins / 60)} h ${durationMins % 60} min` : `${durationMins} min`;

  return {
    coordinates,
    distanceText,
    distanceMeters: route.distanceMeters || 0,
    durationText,
    durationSeconds,
    startAddress: origin,
    endAddress: destination,
    startLocation: coordinates.length > 0 ? coordinates[0] : { latitude: 0, longitude: 0 },
    endLocation: coordinates.length > 0 ? coordinates[coordinates.length - 1] : { latitude: 0, longitude: 0 },
    steps,
  };
}
