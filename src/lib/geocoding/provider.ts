export interface GeocodingResult {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
  osmType?: string;
  attribution?: string;
}

export interface GeocodingOptions {
  center?: { lat: number; lng: number };
  limit?: number;
  countryCode?: string;
}

export interface GeocodingProvider {
  name: string;
  search(query: string, options?: GeocodingOptions): Promise<GeocodingResult[]>;
  reverse?(lat: number, lng: number): Promise<GeocodingResult | null>;
}

// In-memory cache for geocoding queries
const geocodeCache = new Map<string, { timestamp: number; results: GeocodingResult[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Rate limiter for OSM/Nominatim (max 1 request per second)
let lastNominatimRequestTime = 0;
async function waitNominatimRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();
}

/**
 * Photon (Komoot) + OpenStreetMap Geocoding Provider
 * Free, fast, privacy-respecting, biased towards user viewport and India
 */
export class OsmPhotonGeocodingProvider implements GeocodingProvider {
  name = "OpenStreetMap / Photon";

  async search(query: string, options?: GeocodingOptions): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) return [];

    const center = options?.center || { lat: 28.6315, lng: 77.2167 }; // Default Delhi CP
    const limit = options?.limit || 6;
    const cacheKey = `photon:${trimmed.toLowerCase()}:${center.lat.toFixed(2)}:${center.lng.toFixed(2)}:${limit}`;

    // Check cache
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results;
    }

    try {
      // 1. Try Photon (photon.komoot.io) with map center bias
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", trimmed);
      url.searchParams.set("lat", center.lat.toString());
      url.searchParams.set("lon", center.lng.toString());
      url.searchParams.set("limit", limit.toString());
      url.searchParams.set("lang", "en");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "SafeLayer-Navigation/1.0 (osm-photon-search; contact: safelayer-demo@example.com)",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const results: GeocodingResult[] = data.features.map((feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [center.lng, center.lat];
            const name = props.name || props.street || props.city || trimmed;
            const addressParts = [
              props.name !== props.street ? props.street : null,
              props.district,
              props.city,
              props.state,
              props.country,
            ].filter(Boolean);

            const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : name;

            return {
              id: `photon_${props.osm_id || idx}_${coords[0].toFixed(5)}_${coords[1].toFixed(5)}`,
              name,
              fullAddress: fullAddress !== name ? `${name}, ${fullAddress}` : name,
              lng: coords[0],
              lat: coords[1],
              osmType: props.osm_type,
              attribution: "© OpenStreetMap contributors, Photon by Komoot",
            };
          });

          geocodeCache.set(cacheKey, { timestamp: Date.now(), results });
          return results;
        }
      }
    } catch (err) {
      console.warn("Photon geocoding failed, attempting Nominatim fallback:", err);
    }

    // 2. Nominatim fallback with rate limiting
    try {
      await waitNominatimRateLimit();
      const nomUrl = new URL("https://nominatim.openstreetmap.org/search");
      nomUrl.searchParams.set("q", trimmed);
      nomUrl.searchParams.set("format", "json");
      nomUrl.searchParams.set("limit", limit.toString());
      nomUrl.searchParams.set("countrycodes", options?.countryCode || "in");
      nomUrl.searchParams.set("addressdetails", "1");

      const nomResponse = await fetch(nomUrl.toString(), {
        headers: {
          "User-Agent": "SafeLayer-Navigation/1.0 (nominatim-fallback; contact: safelayer-demo@example.com)",
          Accept: "application/json",
        },
      });

      if (nomResponse.ok) {
        const data = await nomResponse.json();
        const results: GeocodingResult[] = data.map((item: any) => ({
          id: `nom_${item.place_id}`,
          name: item.name || item.display_name.split(",")[0],
          fullAddress: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          osmType: item.osm_type,
          attribution: "© OpenStreetMap contributors",
        }));

        geocodeCache.set(cacheKey, { timestamp: Date.now(), results });
        return results;
      }
    } catch (err) {
      console.error("Nominatim fallback also failed:", err);
    }

    return [];
  }
}

/**
 * Google Places Geocoding Provider
 * Used when GOOGLE_MAPS_API_KEY is configured
 */
export class GoogleGeocodingProvider implements GeocodingProvider {
  name = "Google Places";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options?: GeocodingOptions): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) return [];

    const center = options?.center || { lat: 28.6315, lng: 77.2167 };
    const cacheKey = `google:${trimmed.toLowerCase()}:${center.lat.toFixed(2)}:${center.lng.toFixed(2)}`;

    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results;
    }

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", trimmed);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("location", `${center.lat},${center.lng}`);
      url.searchParams.set("radius", "50000"); // 50km bias
      url.searchParams.set("components", "country:in");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.predictions && data.predictions.length > 0) {
          // Resolve place details for coordinates
          const detailedResults = await Promise.all(
            data.predictions.slice(0, options?.limit || 5).map(async (pred: any) => {
              try {
                const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
                detailUrl.searchParams.set("place_id", pred.place_id);
                detailUrl.searchParams.set("fields", "geometry,name,formatted_address");
                detailUrl.searchParams.set("key", this.apiKey);

                const detailRes = await fetch(detailUrl.toString());
                const detailData = await detailRes.json();
                const loc = detailData.result?.geometry?.location;

                if (loc) {
                  return {
                    id: `google_${pred.place_id}`,
                    name: pred.structured_formatting?.main_text || pred.description.split(",")[0],
                    fullAddress: pred.description,
                    lat: loc.lat,
                    lng: loc.lng,
                    attribution: "Google Maps Platform",
                  };
                }
              } catch {
                return null;
              }
              return null;
            })
          );

          const filtered = detailedResults.filter((r): r is GeocodingResult => r !== null);
          geocodeCache.set(cacheKey, { timestamp: Date.now(), results: filtered });
          return filtered;
        }
      }
    } catch (err) {
      console.warn("Google Places geocoding failed, falling back to OSM:", err);
    }

    // Fall back to OSM if Google request fails
    const fallback = new OsmPhotonGeocodingProvider();
    return fallback.search(query, options);
  }
}

/**
 * Factory to instantiate active GeocodingProvider based on environment
 */
export function getGeocodingProvider(): GeocodingProvider {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    return new GoogleGeocodingProvider(googleKey);
  }
  return new OsmPhotonGeocodingProvider();
}
