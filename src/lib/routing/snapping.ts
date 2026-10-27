import { RoadSegment } from "@/types";

export interface SnappingResult {
  matchedSegments: RoadSegment[];
  coveragePercentage: number;
  hasKnownCoverage: boolean;
  unmatchedSegmentsNote?: string;
  isDemoCorridor: boolean;
}

/**
 * Great-circle distance between two coordinates in meters
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Minimum distance in meters from a point to a polyline segment
 */
export function distanceToSegmentMeters(
  point: [number, number],
  segGeometry: [number, number][]
): number {
  let minDistance = Infinity;
  for (const [sLat, sLng] of segGeometry) {
    const d = haversineMeters(point[0], point[1], sLat, sLng);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

/**
 * Snaps any route polyline to the nearest known segments.
 * Stretches beyond the tuned threshold (default 75 meters) are categorized as unmapped / "No data yet".
 */
export function snapPolylineToSegments(
  polyline: [number, number][],
  segments: RoadSegment[],
  thresholdMeters = 75
): SnappingResult {
  if (!polyline || polyline.length === 0 || !segments || segments.length === 0) {
    return {
      matchedSegments: [],
      coveragePercentage: 0,
      hasKnownCoverage: false,
      unmatchedSegmentsNote: "No reports here yet. Be the first to report.",
      isDemoCorridor: false,
    };
  }

  const matchedSet = new Set<string>();
  let pointsCovered = 0;

  for (const pt of polyline) {
    let closestDist = Infinity;
    let closestSeg: RoadSegment | null = null;

    for (const seg of segments) {
      const d = distanceToSegmentMeters(pt, seg.geometry);
      if (d < closestDist) {
        closestDist = d;
        closestSeg = seg;
      }
    }

    if (closestSeg && closestDist <= thresholdMeters) {
      matchedSet.add(closestSeg.id);
      pointsCovered++;
    }
  }

  const matchedSegments = segments.filter((s) => matchedSet.has(s.id));
  const coveragePercentage = Math.round((pointsCovered / polyline.length) * 100);
  const hasKnownCoverage = matchedSegments.length > 0;

  // Check if matched segments belong to seeded Central Delhi demo corridor
  const isDemoCorridor = matchedSegments.some(
    (s) => s.corridor === "delhi_cp" || s.id.startsWith("seg_cp_")
  );

  let unmatchedSegmentsNote: string | undefined;
  if (!hasKnownCoverage || coveragePercentage < 20) {
    unmatchedSegmentsNote = "No reports here yet. Be the first to report.";
  } else if (coveragePercentage < 80) {
    unmatchedSegmentsNote = "Partial coverage along corridor. Some stretches have no reports yet.";
  }

  return {
    matchedSegments,
    coveragePercentage,
    hasKnownCoverage,
    unmatchedSegmentsNote,
    isDemoCorridor,
  };
}
