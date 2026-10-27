import { StreetViewPrior } from "@/types";

export interface StreetViewAnalysisInput {
  segmentId: string;
  lat: number;
  lng: number;
  roadName: string;
}

export interface PlaceSurroundingSignals {
  hospitalsNearby: number;
  policeNearby: number;
  openLateStores: number;
}

export class BaselineEngine {
  /**
   * Computes a weak baseline prior hazard score for an uninspected road segment.
   * STRICT HONESTY RULES:
   * 1. Street View daylight camera can only show fixture existence, NOT whether electricity/bulbs function at night.
   * 2. Tagged explicitly as "lamps present, working status unknown".
   * 3. Given weak prior weight (0.25). Fresh user reports always override this baseline.
   * 4. Per Google Maps Terms: Raw Street View imagery is processed ephemerally and never permanently stored.
   */
  static synthesizePrior(input: StreetViewAnalysisInput, places?: PlaceSurroundingSignals): StreetViewPrior {
    // Deterministic simulation based on location hash for cold start demo
    const hash = Math.abs(Math.sin(input.lat * 1000 + input.lng * 1000));
    const lampsPresent = hash > 0.25; // 75% of main urban roads have lamp poles
    const roadSurfaceScore = 2 + Math.floor(hash * 3.5); // 2 to 5
    const footpathPresent = hash > 0.45; // 55% have pedestrian sidewalks
    const visibilityScore = 2 + Math.floor(hash * 3);

    const placesSignals = places || {
      hospitalsNearby: hash > 0.7 ? 1 : 0,
      policeNearby: hash > 0.8 ? 1 : 0,
      openLateStores: Math.floor(hash * 6),
    };

    // Calculate baseline hazard prior (0.0 to 1.0)
    // Higher score = higher hazard / risk
    let baselineHazard = 0.5;

    // Infrastructure signals
    if (!lampsPresent) baselineHazard += 0.25;
    if (!footpathPresent) baselineHazard += 0.15;
    if (roadSurfaceScore <= 2) baselineHazard += 0.15;

    // Commercial / guardian presence alleviates isolation
    const totalCommercialActivity = placesSignals.openLateStores * 0.05 + placesSignals.policeNearby * 0.15 + placesSignals.hospitalsNearby * 0.1;
    baselineHazard = Math.max(0.1, Math.min(0.9, baselineHazard - totalCommercialActivity));

    const imageryYear = 2022 + Math.floor(hash * 2);
    const imageryMonth = 1 + Math.floor(hash * 11);
    const imageryDate = `${imageryYear}-${imageryMonth < 10 ? "0" + imageryMonth : imageryMonth}`;

    return {
      segmentId: input.segmentId,
      coordinates: { lat: input.lat, lng: input.lng },
      lampsPresent,
      lampsWorkingStatus: "unknown", // NEVER mark "working" without night user report!
      roadSurfaceScore,
      footpathPresent,
      visibilityScore,
      commercialActivity: placesSignals.openLateStores >= 3 ? "high" : placesSignals.openLateStores >= 1 ? "medium" : "low",
      imageryDate,
      priorHazardScore: Math.round(baselineHazard * 100) / 100,
      priorWeight: 0.25, // Weak prior honesty rule
      placesSignals: {
        hospitalsNearby: placesSignals.hospitalsNearby,
        policeNearby: placesSignals.policeNearby,
        openLateStores: placesSignals.openLateStores,
      },
    };
  }
}
