import { HazardReport, RoadSegment, RouteAlternative, TravelMode } from "@/types";
import { RiskModel } from "../risk/model";
import { snapPolylineToSegments } from "./snapping";

export class RoutingEngine {
  /**
   * Base weights applied to hazard categories based on travel mode
   */
  private static MODE_WEIGHTS: Record<TravelMode, Record<string, number>> = {
    walking: {
      lighting: 1.8,
      isolated_stretch: 2.0,
      footpath_missing: 2.2,
      road_condition: 0.8,
      obstruction: 1.0,
      other: 1.0,
    },
    two_wheeler: {
      lighting: 1.4,
      isolated_stretch: 1.0,
      footpath_missing: 0.2,
      road_condition: 2.2, // Potholes/debris are critical hazards for two-wheelers
      obstruction: 2.0,
      other: 1.1,
    },
    driving: {
      lighting: 0.9,
      isolated_stretch: 0.7,
      footpath_missing: 0.1,
      road_condition: 1.4,
      obstruction: 1.8,
      other: 1.0,
    },
    night_commute: {
      // Kept for backward compatibility
      lighting: 2.5,
      isolated_stretch: 2.4,
      footpath_missing: 1.3,
      road_condition: 1.3,
      obstruction: 1.5,
      other: 1.2,
    },
  };

  /**
   * Re-rank candidate routes by integrating segment-level risk at travel time,
   * modulated by the user's travel mode preference and departure time.
   */
  static rankRoutes(
    candidates: {
      id: string;
      name: string;
      durationMinutes: number;
      distanceKm: number;
      polyline: [number, number][];
    }[],
    roadSegments: RoadSegment[],
    allReports: HazardReport[],
    mode: TravelMode = "walking",
    queryHourOrDate: number | Date = new Date()
  ): RouteAlternative[] {
    const queryDate =
      typeof queryHourOrDate === "number"
        ? new Date(2026, 9, 26, queryHourOrDate, 0, 0)
        : queryHourOrDate;
    return this.reRankRoutes(candidates, roadSegments, allReports, mode, queryDate);
  }

  static reRankRoutes(
    candidates: {
      id: string;
      name: string;
      durationMinutes: number;
      distanceKm: number;
      polyline: [number, number][];
    }[],
    roadSegments: RoadSegment[],
    allReports: HazardReport[],
    mode: TravelMode = "walking",
    queryTime = new Date()
  ): RouteAlternative[] {
    const modeKey = mode in this.MODE_WEIGHTS ? mode : "walking";
    const modeWeights = this.MODE_WEIGHTS[modeKey];
    const queryHour = queryTime.getHours();
    const isNight = queryHour >= 19 || queryHour < 6;

    const scoredAlternatives = candidates.map((cand) => {
      // Snap polyline to known segments within 75 meters
      const snapping = snapPolylineToSegments(cand.polyline, roadSegments, 75);
      const matchedSegments = snapping.matchedSegments;

      // Handle stretches with no baseline and no reports honestly
      if (matchedSegments.length === 0) {
        return {
          id: cand.id,
          name: cand.name,
          isRecommended: false,
          durationMinutes: cand.durationMinutes,
          distanceKm: cand.distanceKm,
          polyline: cand.polyline,
          riskScore: 0,
          riskCategory: "low_risk" as const,
          hazardsEncountered: [],
          priorsEncountered: [],
          reasons: [],
          tradeoffSummary: "No reports here yet. Be the first to report.",
          reportedIssuesCount: 0,
          issueLevel: "no_data" as const,
          dataSource: "no_data_yet" as const,
          coveragePercentage: 0,
          coverageNote: "No reports here yet. Be the first to report.",
          matchedSegmentIds: [],
        };
      }

      let totalWeightedRisk = 0;
      const encounteredHazards: HazardReport[] = [];
      const encounteredPriors = matchedSegments.map((s) => s.baselinePrior);
      const reasons: string[] = [];

      for (const seg of matchedSegments) {
        const segRisk = RiskModel.computeSegmentRisk(seg.id, seg.baselinePrior, allReports, queryTime);
        const segReports = allReports.filter(
          (r) => r.segmentId === seg.id && r.status === "published"
        );

        // Apply mode and nocturnal weighting
        let multiplier = 1.0;
        if (segRisk.dominantHazard && modeWeights[segRisk.dominantHazard]) {
          multiplier = modeWeights[segRisk.dominantHazard];
        }

        // Night time boosts sensitivity to lighting and isolated stretches
        if (isNight) {
          if (segRisk.dominantHazard === "lighting") multiplier *= 1.4;
          if (segRisk.dominantHazard === "isolated_stretch") multiplier *= 1.3;
        }

        totalWeightedRisk += segRisk.compositeRiskScore * multiplier;

        for (const rep of segReports) {
          if (!encounteredHazards.some((h) => h.id === rep.id)) {
            encounteredHazards.push(rep);
          }
        }

        if (segRisk.compositeRiskScore > 0.45 && segRisk.dominantHazard) {
          const reasonText = `${seg.name}: ${segRisk.dominantHazard.replace("_", " ")} reported (${Math.round(segRisk.compositeRiskScore * 100)}% caution)`;
          if (!reasons.includes(reasonText)) {
            reasons.push(reasonText);
          }
        }
      }

      const segmentCount = Math.max(1, matchedSegments.length);
      const averageSegmentRisk = totalWeightedRisk / segmentCount;
      const normalizedScore = Math.min(100, Math.round(averageSegmentRisk * 100));

      let riskCategory: "low_risk" | "moderate_caution" | "elevated_risk" = "low_risk";
      if (normalizedScore >= 60) riskCategory = "elevated_risk";
      else if (normalizedScore >= 35) riskCategory = "moderate_caution";

      const issueCount = encounteredHazards.length;
      let issueLevel: "fewer_issues" | "some_issues" | "many_issues" | "no_data" = "fewer_issues";
      if (issueCount === 0) issueLevel = "fewer_issues";
      else if (issueCount <= 2) issueLevel = "some_issues";
      else issueLevel = "many_issues";

      const dataSource = snapping.isDemoCorridor ? ("demo_data" as const) : ("live_data" as const);

      return {
        id: cand.id,
        name: cand.name,
        isRecommended: false,
        durationMinutes: cand.durationMinutes,
        distanceKm: cand.distanceKm,
        polyline: cand.polyline,
        riskScore: normalizedScore,
        riskCategory,
        hazardsEncountered: encounteredHazards,
        priorsEncountered: encounteredPriors,
        reasons,
        tradeoffSummary: "",
        reportedIssuesCount: issueCount,
        issueLevel,
        dataSource,
        coveragePercentage: snapping.coveragePercentage,
        coverageNote: snapping.unmatchedSegmentsNote,
        matchedSegmentIds: matchedSegments.map((s) => s.id),
      };
    });

    // Determine baseline fastest route vs lowest reported risk route
    const fastest = [...scoredAlternatives].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
    const lowestRisk = [...scoredAlternatives].sort((a, b) => a.riskScore - b.riskScore)[0];

    // Recommend the route with fewer reported issues if substantial risk reduction
    const recommendedId =
      lowestRisk.riskScore < fastest.riskScore * 0.85 ? lowestRisk.id : fastest.id;

    return scoredAlternatives.map((route) => {
      const isRec = route.id === recommendedId;
      const timeDiff = route.durationMinutes - fastest.durationMinutes;
      const issueDiff = fastest.hazardsEncountered.length - route.hazardsEncountered.length;
      const riskReduction =
        fastest.riskScore > 0
          ? Math.round(((fastest.riskScore - route.riskScore) / fastest.riskScore) * 100)
          : 0;

      let tradeoffSummary = "";
      if (route.coveragePercentage === 0) {
        tradeoffSummary = "No reports here yet. Be the first to report.";
      } else if (route.id === fastest.id && route.id === lowestRisk.id) {
        tradeoffSummary = "Fastest route with fewest reported issues.";
      } else if (route.id === fastest.id) {
        tradeoffSummary = `Fastest route (${route.durationMinutes} min), passes ${route.hazardsEncountered.length} reported issues.`;
      } else if (timeDiff > 0 && issueDiff > 0) {
        tradeoffSummary = `+${timeDiff} min, ${issueDiff} fewer reported issues.`;
      } else if (timeDiff > 0 && riskReduction > 0) {
        tradeoffSummary = `+${timeDiff} min, ${riskReduction}% fewer reported issues.`;
      } else {
        tradeoffSummary = `Alternative route with ${route.hazardsEncountered.length} reported issues.`;
      }

      return {
        ...route,
        isRecommended: isRec,
        tradeoffSummary,
      };
    });
  }
}
