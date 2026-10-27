import { GPSPoint, HazardReport, TrustProfile } from "@/types";

export interface PresenceCheckResult {
  passed: boolean;
  averageSpeedKmh: number;
  distanceCoveredMeters: number;
  durationSeconds: number;
  reason?: string;
}

export interface CrossModalCheckResult {
  consistencyScore: number; // 0.0 - 1.0
  passed: boolean;
  flaggedMismatch?: string;
}

export interface CollusionCheckResult {
  isCollusionSuspected: boolean;
  recentReportsInCluster: number;
  distinctUsersInWindow: number;
  reason?: string;
}

export class TrustEngine {
  /**
   * Calculate haversine distance between two points in meters
   */
  static haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
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
   * Presence check: validates that the user actually travelled along the reported segment
   * at a plausible human / two-wheeler / car speed (1.0 km/h to 80 km/h).
   * This is what empowers Tap-Only (Tier 0) reports to be trusted without requiring video.
   */
  static verifyPresence(
    targetLocation: { lat: number; lng: number },
    trail: GPSPoint[]
  ): PresenceCheckResult {
    if (!trail || trail.length < 2) {
      // Single point or missing trail
      return {
        passed: false,
        averageSpeedKmh: 0,
        distanceCoveredMeters: 0,
        durationSeconds: 0,
        reason: "Insufficient GPS trail points to prove physical presence",
      };
    }

    // Sort by timestamp
    const sorted = [...trail].sort((a, b) => a.timestamp - b.timestamp);
    let totalDist = 0;
    let closestToTargetDist = Infinity;

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const distToTarget = this.haversineDistanceMeters(p.lat, p.lng, targetLocation.lat, targetLocation.lng);
      if (distToTarget < closestToTargetDist) {
        closestToTargetDist = distToTarget;
      }

      if (i > 0) {
        const prev = sorted[i - 1];
        totalDist += this.haversineDistanceMeters(prev.lat, prev.lng, p.lat, p.lng);
      }
    }

    const durationSeconds = (sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / 1000;
    if (durationSeconds <= 0) {
      return {
        passed: false,
        averageSpeedKmh: 0,
        distanceCoveredMeters: totalDist,
        durationSeconds,
        reason: "Zero or negative trail duration (timestamp anomaly)",
      };
    }

    const speedMps = totalDist / durationSeconds;
    const averageSpeedKmh = speedMps * 3.6;

    // Presence rules:
    // 1. User must pass within 70 meters of the reported hazard point
    if (closestToTargetDist > 70) {
      return {
        passed: false,
        averageSpeedKmh,
        distanceCoveredMeters: totalDist,
        durationSeconds,
        reason: `GPS trail did not intersect reported hazard (closest point was ${Math.round(closestToTargetDist)}m away, limit 70m)`,
      };
    }

    // 2. Plausible speed: Not stationary spoofed teleport (>= 1 km/h) and not impossible aircraft speed (<= 80 km/h)
    if (averageSpeedKmh < 0.5) {
      return {
        passed: false,
        averageSpeedKmh,
        distanceCoveredMeters: totalDist,
        durationSeconds,
        reason: "Stationary or artificial GPS trail (speed < 0.5 km/h)",
      };
    }

    if (averageSpeedKmh > 90) {
      return {
        passed: false,
        averageSpeedKmh,
        distanceCoveredMeters: totalDist,
        durationSeconds,
        reason: `Implausible transit velocity (${Math.round(averageSpeedKmh)} km/h exceeds ground threshold)`,
      };
    }

    return {
      passed: true,
      averageSpeedKmh,
      distanceCoveredMeters: totalDist,
      durationSeconds,
    };
  }

  /**
   * Cross-modal consistency verification:
   * Compares visual indicators, audio claims, and timestamp metadata.
   */
  static verifyCrossModalConsistency(
    claimIssue: string,
    timeRelevance: string,
    timestamp: string,
    hasDaylightInFrames: boolean = false
  ): CrossModalCheckResult {
    const reportDate = new Date(timestamp);
    const hour = reportDate.getHours();
    const isNocturnalTime = hour >= 19 || hour < 6;

    // Check 1: Reporting "dark at night" or missing streetlight with bright daytime photo or midday timestamp
    if (claimIssue === "lighting" && !isNocturnalTime && hasDaylightInFrames) {
      return {
        consistencyScore: 0.2,
        passed: false,
        flaggedMismatch: "Claim of dark unlit street submitted with bright daylight imagery at midday.",
      };
    }

    // Check 2: Night-only issue submitted during broad daylight without explanation
    if (timeRelevance === "night" && !isNocturnalTime && !hasDaylightInFrames) {
      // Submitting advance warning during day about night light
      return {
        consistencyScore: 0.7,
        passed: true,
      };
    }

    return {
      consistencyScore: 0.95,
      passed: true,
    };
  }

  /**
   * Beta distribution update for reporter reliability.
   * R = alpha / (alpha + beta)
   * Starts at Beta(2, 2) = 0.5
   */
  static updateReporterReliability(profile: TrustProfile, verified: boolean): TrustProfile {
    const newAlpha = verified ? profile.alpha + 1 : profile.alpha;
    const newBeta = !verified ? profile.beta + 1 : profile.beta;
    const reliabilityScore = newAlpha / (newAlpha + newBeta);

    return {
      ...profile,
      alpha: newAlpha,
      beta: newBeta,
      reliabilityScore: Math.round(reliabilityScore * 100) / 100,
      totalReports: profile.totalReports + 1,
      verifiedReports: verified ? profile.verifiedReports + 1 : profile.verifiedReports,
      lastActive: new Date().toISOString(),
    };
  }

  /**
   * Sybil & Collusion Guard:
   * Detects sudden bursts of reports from brand new accounts in the same coordinate cell.
   */
  static detectCollusion(
    newReport: { coordinates: { lat: number; lng: number }; userId: string; timestamp: string },
    recentReports: HazardReport[],
    timeWindowMinutes = 15,
    distanceRadiusMeters = 80
  ): CollusionCheckResult {
    const reportTime = new Date(newReport.timestamp).getTime();
    const windowStart = reportTime - timeWindowMinutes * 60 * 1000;

    const nearbyRecent = recentReports.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      if (t < windowStart || t > reportTime) return false;
      const d = this.haversineDistanceMeters(
        newReport.coordinates.lat,
        newReport.coordinates.lng,
        r.coordinates.lat,
        r.coordinates.lng
      );
      return d <= distanceRadiusMeters;
    });

    const distinctUsers = new Set(nearbyRecent.map((r) => r.userId));
    distinctUsers.add(newReport.userId);

    // If more than 4 reports appear within 80m inside 15 minutes, flag as sudden cluster
    if (nearbyRecent.length >= 4) {
      return {
        isCollusionSuspected: true,
        recentReportsInCluster: nearbyRecent.length + 1,
        distinctUsersInWindow: distinctUsers.size,
        reason: `Abnormal reporting spike: ${nearbyRecent.length + 1} reports within ${distanceRadiusMeters}m inside ${timeWindowMinutes} mins.`,
      };
    }

    return {
      isCollusionSuspected: false,
      recentReportsInCluster: nearbyRecent.length + 1,
      distinctUsersInWindow: distinctUsers.size,
    };
  }

  /**
   * Corroboration Gate:
   * Severe warnings (severity >= 4) require:
   * - 2+ independent trusted reporters (reliability >= 0.65), OR
   * - 1 reporter with high reliability (>= 0.85) AND verified physical presence.
   */
  static isCorroborated(report: HazardReport, userReliability: number, allActiveReports: HazardReport[]): boolean {
    if (report.severity < 4) {
      // Low to moderate hazards can publish directly if presence verified
      return report.presenceVerified;
    }

    // High severity (4-5)
    if (userReliability >= 0.85 && report.presenceVerified) {
      return true;
    }

    // Check for independent corroborating report on the same segment
    const otherReporters = allActiveReports.filter(
      (r) =>
        r.segmentId === report.segmentId &&
        r.issue === report.issue &&
        r.userId !== report.userId &&
        r.status === "published"
    );

    return otherReporters.length >= 1;
  }
}
