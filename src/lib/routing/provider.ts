import { TravelMode } from "@/types";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CandidateRoute {
  id: string;
  name: string;
  durationMinutes: number;
  distanceKm: number;
  polyline: [number, number][]; // [lat, lng] array
  summary?: string;
}

export interface RoutingProvider {
  name: string;
  getRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: TravelMode
  ): Promise<CandidateRoute[]>;
}

/**
 * Polyline decoder for Google Maps encoded polylines
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * OSRM Routing Provider (Open Source Routing Machine)
 * Supports profiles: foot (walking), bike (two_wheeler), driving (vehicle)
 */
export class OsrmRoutingProvider implements RoutingProvider {
  name = "OSRM (OpenStreetMap)";

  async getRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: TravelMode
  ): Promise<CandidateRoute[]> {
    // Map SafeLayer travel mode to OSRM profile
    let profile = "driving";
    if (mode === "walking") {
      profile = "foot";
    } else if (mode === "two_wheeler") {
      profile = "bike";
    } else if (mode === "night_commute") {
      profile = "foot";
    }

    try {
      // router.project-osrm.org demo endpoint
      // coordinates format: {lng},{lat};{lng},{lat}
      const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=true&steps=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(url, {
        headers: {
          "User-Agent": "SafeLayer-Navigation/1.0 (OSRM client; contact: safelayer-demo@example.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          return data.routes.map((r: any, idx: number) => {
            // OSRM geojson coordinates are [lng, lat]
            const polyline: [number, number][] = (r.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]] // convert to [lat, lng]
            );

            const durationMinutes = Math.max(1, Math.round(r.duration / 60));
            const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
            const legNames = (r.legs?.[0]?.steps || [])
              .map((s: any) => s.name)
              .filter((n: string) => n && n.length > 1);
            const distinctLegs = Array.from(new Set(legNames)).slice(0, 2);
            const routeName = distinctLegs.length > 0 ? `Via ${distinctLegs.join(" & ")}` : `Route ${idx + 1}`;

            return {
              id: `osrm_route_${idx + 1}`,
              name: routeName,
              durationMinutes,
              distanceKm,
              polyline,
              summary: r.legs?.[0]?.summary || "",
            };
          });
        }
      }
    } catch (err: any) {
      console.warn("OSRM routing request failed:", err.message || err);
    }

    // Direct straight-line path fallback if OSRM is unreachable
    return this.createFallbackRoute(origin, destination, mode);
  }

  private createFallbackRoute(
    origin: LatLng,
    destination: LatLng,
    mode: TravelMode
  ): CandidateRoute[] {
    // Generate simple interpolated waypoints
    const distLat = destination.lat - origin.lat;
    const distLng = destination.lng - origin.lng;
    const distanceKm = Math.round(
      Math.sqrt(distLat * distLat + distLng * distLng) * 111 * 10
    ) / 10;

    const speedKmh = mode === "walking" || mode === "night_commute" ? 4.5 : mode === "two_wheeler" ? 22 : 30;
    const durationMinutes = Math.max(2, Math.round((distanceKm / speedKmh) * 60));

    // Simple 3-point line
    const midLat = origin.lat + distLat * 0.5 + 0.0008;
    const midLng = origin.lng + distLng * 0.5 - 0.0008;

    return [
      {
        id: "fallback_route_primary",
        name: "Direct Corridor (Standard Path)",
        durationMinutes,
        distanceKm,
        polyline: [
          [origin.lat, origin.lng],
          [midLat, midLng],
          [destination.lat, destination.lng],
        ],
      },
    ];
  }
}

/**
 * Google Directions Routing Provider
 */
export class GoogleRoutingProvider implements RoutingProvider {
  name = "Google Directions";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: TravelMode
  ): Promise<CandidateRoute[]> {
    let googleMode = "driving";
    if (mode === "walking" || mode === "night_commute") {
      googleMode = "walking";
    } else if (mode === "two_wheeler") {
      googleMode = "bicycling";
    }

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
      url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
      url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
      url.searchParams.set("mode", googleMode);
      url.searchParams.set("alternatives", "true");
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.routes && data.routes.length > 0) {
          return data.routes.map((r: any, idx: number) => {
            const leg = r.legs?.[0];
            const durationMinutes = Math.max(1, Math.round((leg?.duration?.value || 300) / 60));
            const distanceKm = Math.round(((leg?.distance?.value || 1000) / 1000) * 10) / 10;
            const polyline = decodeGooglePolyline(r.overview_polyline?.points || "");

            return {
              id: `google_route_${idx + 1}`,
              name: r.summary ? `Via ${r.summary}` : `Route ${idx + 1}`,
              durationMinutes,
              distanceKm,
              polyline,
              summary: r.summary,
            };
          });
        }
      }
    } catch (err) {
      console.warn("Google Directions error, falling back to OSRM:", err);
    }

    const osrm = new OsrmRoutingProvider();
    return osrm.getRoutes(origin, destination, mode);
  }
}

/**
 * Factory to get active routing provider
 */
export function getRoutingProvider(): RoutingProvider {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    return new GoogleRoutingProvider(googleKey);
  }
  return new OsrmRoutingProvider();
}
