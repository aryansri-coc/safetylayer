import { HazardReport, HazardType, StreetViewPrior } from "@/types";

export interface SegmentRiskAtTime {
  segmentId: string;
  queryHour: number; // 0 - 23
  compositeRiskScore: number; // 0.0 (safest) to 1.0 (highest hazard)
  priorContribution: number;
  crowdsourcedContribution: number;
  dominantHazard?: HazardType;
  hazardBreakdown: Record<HazardType, number>;
  activeReportCount: number;
  decayedReports: { issue: HazardType; effectiveSeverity: number; ageHours: number }[];
}

export class RiskModel {
  /**
   * Half-life decay rates in hours for different hazard types
   */
  private static DECAY_HALF_LIVES_HOURS: Record<HazardType, number> = {
    lighting: 72, // 3 days (streetlight outages can persist until repaired)
    road_condition: 504, // 21 days (potholes stay weeks)
    footpath_missing: 1440, // 60 days (structural municipal absence)
    isolated_stretch: 720, // 30 days (architectural / layout isolation)
    obstruction: 12, // 12 hours (debris/fallen trees usually cleared quickly)
    other: 48,
  };

  /**
   * Compute temporal diurnal factor based on hour of travel (0-23)
   */
  static getTimeOfDayFactor(issue: HazardType, queryHour: number): number {
    const isNight = queryHour >= 19 || queryHour < 6;
    const isLateNight = queryHour >= 22 || queryHour < 4;

    switch (issue) {
      case "lighting":
        if (isLateNight) return 1.0;
        if (isNight) return 0.85;
        if (queryHour === 6 || queryHour === 18) return 0.3;
        return 0.05; // Streetlight out at noon has negligible impact

      case "isolated_stretch":
        if (isLateNight) return 1.0;
        if (isNight) return 0.75;
        return 0.25;

      case "footpath_missing":
        // Peak traffic hours are actually more dangerous for missing footpaths
        if ((queryHour >= 8 && queryHour <= 11) || (queryHour >= 17 && queryHour <= 21)) {
          return 1.0; // High speed rush hour
        }
        return isNight ? 0.9 : 0.6;

      case "road_condition":
        // Night makes potholes more hazardous due to reduced stopping distance
        return isNight ? 1.0 : 0.7;

      case "obstruction":
        return isNight ? 1.0 : 0.6;

      default:
        return 0.5;
    }
  }

  /**
   * Exponential decay calculation:
   * remaining_severity = initial_severity * 0.5^(age / half_life)
   */
  static computeDecayedSeverity(report: HazardReport, currentTime = new Date()): number {
    const reportTime = new Date(report.timestamp).getTime();
    const ageHours = Math.max(0, (currentTime.getTime() - reportTime) / (1000 * 60 * 60));
    const halfLife = this.DECAY_HALF_LIVES_HOURS[report.issue] || 48;

    const decayFactor = Math.pow(0.5, ageHours / halfLife);
    return report.severity * decayFactor;
  }

  /**
   * Calculate Bayesian composite risk score for a road segment at a specific travel time.
   * Integrates weak Street View prior + decayed active reports + diurnal time modulation.
   */
  static calculateSegmentRisk(
    segmentId: string,
    prior: StreetViewPrior,
    reports: HazardReport[],
    queryHourOrDate: number | Date = new Date()
  ): SegmentRiskAtTime {
    const queryDate = typeof queryHourOrDate === "number"
      ? new Date(2026, 9, 26, queryHourOrDate, 0, 0)
      : queryHourOrDate;
    return this.computeSegmentRisk(segmentId, prior, reports, queryDate);
  }

  static computeSegmentRisk(
    segmentId: string,
    prior: StreetViewPrior,
    reports: HazardReport[],
    queryTime = new Date()
  ): SegmentRiskAtTime {
    const queryHour = queryTime.getHours();
    const publishedReports = reports.filter((r) => r.segmentId === segmentId && r.status === "published");

    const hazardBreakdown: Record<HazardType, number> = {
      lighting: 0,
      road_condition: 0,
      footpath_missing: 0,
      isolated_stretch: 0,
      obstruction: 0,
      other: 0,
    };

    const decayedReportsList: { issue: HazardType; effectiveSeverity: number; ageHours: number }[] = [];

    // Accumulate user evidence
    let totalReportRiskNumerator = 0;
    let totalReportWeight = 0;

    for (const report of publishedReports) {
      const ageHours = Math.max(0, (queryTime.getTime() - new Date(report.timestamp).getTime()) / (1000 * 60 * 60));
      const decayedSeverity = this.computeDecayedSeverity(report, queryTime);
      const timeFactor = this.getTimeOfDayFactor(report.issue, queryHour);

      // Report weight factors: presence verified gives full weight, confidence scales weight
      const weight = (report.presenceVerified ? 1.0 : 0.6) * report.confidence;
      const normalizedHazard = (decayedSeverity / 5.0) * timeFactor;

      hazardBreakdown[report.issue] = Math.max(hazardBreakdown[report.issue], normalizedHazard);
      totalReportRiskNumerator += normalizedHazard * weight;
      totalReportWeight += weight;

      decayedReportsList.push({
        issue: report.issue,
        effectiveSeverity: Math.round(decayedSeverity * 10) / 10,
        ageHours: Math.round(ageHours),
      });
    }

    // Bayesian combination:
    // priorWeight is weak (0.25)
    const priorWeight = prior.priorWeight || 0.25;
    // Street View prior time modulation: missing lamp or unknown lamp matters much more at night
    const priorNightPenalty = queryHour >= 19 || queryHour < 6 ? (!prior.lampsPresent ? 0.35 : 0.1) : 0;
    const effectivePrior = Math.min(1.0, prior.priorHazardScore + priorNightPenalty);

    let compositeRisk: number;
    let crowdsourcedScore = 0;

    if (totalReportWeight === 0) {
      // Cold start: Only prior available
      compositeRisk = effectivePrior;
    } else {
      crowdsourcedScore = totalReportRiskNumerator / totalReportWeight;
      // Bayesian update: weighted average between prior and fresh evidence
      compositeRisk = (effectivePrior * priorWeight + crowdsourcedScore * totalReportWeight) / (priorWeight + totalReportWeight);
    }

    // Find dominant hazard
    let dominantHazard: HazardType | undefined;
    let maxHazardVal = 0;
    for (const [hazard, val] of Object.entries(hazardBreakdown) as [HazardType, number][]) {
      if (val > maxHazardVal) {
        maxHazardVal = val;
        dominantHazard = hazard;
      }
    }

    return {
      segmentId,
      queryHour,
      compositeRiskScore: Math.round(Math.min(1.0, Math.max(0.0, compositeRisk)) * 100) / 100,
      priorContribution: Math.round(effectivePrior * 100) / 100,
      crowdsourcedContribution: Math.round(crowdsourcedScore * 100) / 100,
      dominantHazard,
      hazardBreakdown,
      activeReportCount: publishedReports.length,
      decayedReports: decayedReportsList,
    };
  }
}
