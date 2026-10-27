import { HazardReport, RoadSegment } from "@/types";

export interface ScoutPromptCandidate {
  reportId: string;
  segmentId: string;
  segmentName: string;
  issue: string;
  timeContext: string;
  promptText: string;
  actionText: string;
}

/**
 * Great-circle distance between two coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface ShouldShowPromptOptions {
  userCoords: { lat: number; lng: number } | null;
  speedKmh?: number;
  stationarySeconds?: number;
  isScoutModeOptedIn?: boolean;
  isDemoRunning?: boolean;
  isWelcomeOpen?: boolean;
  isDismissedThisSession?: boolean;
  currentHour?: number;
  lastPromptTimeMs?: number;
}

/**
 * Evaluates whether a scout verification toast is eligible to be shown.
 * Strictly adheres to honesty rules:
 * - Never shows while user is moving (speed > 3 km/h).
 * - Requires live GPS proximity within ~150 meters.
 * - Requires stationary for >= 5s OR opted into scout mode.
 * - Never shows on welcome screen or unless demo is running if in demo flow.
 * - Matches time window (e.g. night reports only prompted after 8 PM / 20:00).
 * - Rate-limited and respects session dismissal.
 * - Neutral wording without volume points.
 */
export function evaluateScoutPrompt(
  reports: HazardReport[],
  segments: RoadSegment[],
  opts: ShouldShowPromptOptions
): ScoutPromptCandidate | null {
  // 1. Transient overlay collision check: never show while welcome card is active
  if (opts.isWelcomeOpen) return null;

  // 2. Session dismissal & rate limiting (at most once every 3 minutes)
  if (opts.isDismissedThisSession) return null;
  const now = Date.now();
  if (opts.lastPromptTimeMs && now - opts.lastPromptTimeMs < 180000) return null;

  // 3. Movement check: NEVER show while moving
  if (opts.speedKmh !== undefined && opts.speedKmh > 3.0) return null;

  // 4. Must be stationary for several seconds (>= 5s) OR opted into scout mode
  const isStationaryLongEnough = (opts.stationarySeconds || 0) >= 5;
  if (!isStationaryLongEnough && !opts.isScoutModeOptedIn && !opts.isDemoRunning) {
    return null;
  }

  // 5. Must have live GPS coordinates
  if (!opts.userCoords) return null;

  const currentHour = opts.currentHour ?? new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 6;

  // 6. Find nearest active published report within 150m matching time window
  for (const report of reports) {
    if (report.status !== "published") continue;

    // Check time window applicability
    if (report.timeRelevance === "night" && !isNight) {
      continue; // Do not prompt for night streetlight in broad daylight
    }

    const dist = calculateDistanceMeters(
      opts.userCoords.lat,
      opts.userCoords.lng,
      report.coordinates.lat,
      report.coordinates.lng
    );

    if (dist <= 150) {
      const seg = segments.find((s) => s.id === report.segmentId);
      const segName = seg ? seg.name : "Near your location";
      const issueName = report.issue.replace(/_/g, " ");

      const timeContext =
        report.timeRelevance === "night" ? "reported after 8 PM" : "recently reported";

      return {
        reportId: report.id,
        segmentId: report.segmentId,
        segmentName: segName,
        issue: report.issue,
        timeContext,
        // Neutral wording per A5:
        promptText: `${segName}: ${issueName} (${timeContext}). Can you confirm this? Your answer helps keep the info accurate.`,
        actionText: "Confirm",
      };
    }
  }

  return null;
}
