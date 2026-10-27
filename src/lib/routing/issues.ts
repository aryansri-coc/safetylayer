import { HazardReport, HazardType, RoadSegment, RouteAlternative } from "@/types";

export interface GroupedHazardChip {
  issue: HazardType;
  label: string;
  count: number;
  highestSeverity: 1 | 2 | 3 | 4 | 5;
  severityLabel: string;
  severityIcon: string;
  explanation: string;
  reports: HazardReport[];
}

export const HAZARD_EXPLANATIONS: Record<HazardType, string> = {
  lighting: "Inactive or missing streetlights reported along this stretch.",
  road_condition: "Potholes, broken asphalt, or open work pits reported.",
  footpath_missing: "No separated sidewalk; walking alongside vehicle traffic.",
  isolated_stretch: "Quiet corridor with low footfall and few open storefronts.",
  obstruction: "Debris, barricades, or material partially blocking the path.",
  other: "Physical road hazard noted by community commuters.",
};

export const HAZARD_ICONS: Record<HazardType, string> = {
  lighting: "⚡",
  road_condition: "▲",
  footpath_missing: "🚶",
  isolated_stretch: "👁",
  obstruction: "⛔",
  other: "!",
};

export function getSeverityDetails(severity: 1 | 2 | 3 | 4 | 5): {
  label: string;
  textClass: string;
  badgeClass: string;
  dotClass: string;
} {
  if (severity >= 4) {
    return {
      label: "High caution",
      textClass: "text-cyber-crimson",
      badgeClass: "bg-cyber-crimson/15 text-cyber-crimson border-cyber-crimson/30",
      dotClass: "bg-cyber-crimson",
    };
  }
  if (severity >= 3) {
    return {
      label: "Moderate caution",
      textClass: "text-cyber-amber",
      badgeClass: "bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30",
      dotClass: "bg-cyber-amber",
    };
  }
  return {
    label: "Minor notice",
    textClass: "text-cyber-emerald",
    badgeClass: "bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/30",
    dotClass: "bg-cyber-emerald",
  };
}

/**
 * SINGLE SOURCE OF TRUTH for distinct route issues:
 * Defined as distinct active published hazards along the route's matched segments,
 * de-duplicated by (segmentId, issue type).
 * Multiple reports of the same defect on the same segment count as 1 distinct issue.
 */
export function getDistinctRouteHazards(
  matchedSegments: RoadSegment[],
  allReports: HazardReport[]
): HazardReport[] {
  const matchedSegmentIds = new Set(matchedSegments.map((s) => s.id));
  const publishedReports = allReports.filter(
    (r) => r.status === "published" && matchedSegmentIds.has(r.segmentId)
  );

  const seenKeys = new Set<string>();
  const distinctHazards: HazardReport[] = [];

  for (const rep of publishedReports) {
    const key = `${rep.segmentId}_${rep.issue}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      distinctHazards.push(rep);
    }
  }

  return distinctHazards;
}

/**
 * Groups distinct route hazards by type with count ("Lighting x3"),
 * sorted by highest severity first, then by count descending.
 */
export function computeGroupedHazardChips(
  hazards: HazardReport[]
): GroupedHazardChip[] {
  const groups = new Map<HazardType, HazardReport[]>();

  for (const h of hazards) {
    const existing = groups.get(h.issue) || [];
    existing.push(h);
    groups.set(h.issue, existing);
  }

  const chips: GroupedHazardChip[] = [];

  groups.forEach((reps, issue) => {
    const highestSev = Math.max(...reps.map((r) => r.severity)) as 1 | 2 | 3 | 4 | 5;
    const sevDetails = getSeverityDetails(highestSev);
    const count = reps.length;
    const readableName = issue.replace(/_/g, " ");

    chips.push({
      issue,
      label: count > 1 ? `${readableName} x${count}` : readableName,
      count,
      highestSeverity: highestSev,
      severityLabel: sevDetails.label,
      severityIcon: HAZARD_ICONS[issue] || "!",
      explanation: HAZARD_EXPLANATIONS[issue] || "Physical road hazard noted by community commuters.",
      reports: reps,
    });
  });

  // Sort descending by highest severity, then by count
  chips.sort((a, b) => {
    if (b.highestSeverity !== a.highestSeverity) {
      return b.highestSeverity - a.highestSeverity;
    }
    return b.count - a.count;
  });

  return chips;
}

export interface RecommendationResult {
  recommendedId: string;
  tradeoffSummaries: Record<string, string>;
}

/**
 * Route Recommendation Selection Rule:
 * - Best safety/time trade-off by a documented, tested rule.
 * - Acceptable extra time: min(10 min, fastest.duration * 0.40) (or at least 10 min).
 * - Routes within acceptable extra time are evaluated by:
 *   1. Fewest distinct issues
 *   2. Lowest risk score
 *   3. Shortest duration
 * - NEVER badge a route Recommended when another has strictly fewer issues at an acceptable time cost.
 * - Plain-language labels:
 *   - "Fastest route, fewest reported issues"
 *   - "Fewer reported issues, +N min"
 *   - "Fastest route (N min), passes M reported issues"
 */
export function selectRecommendedRoute(
  routes: Array<{
    id: string;
    durationMinutes: number;
    reportedIssuesCount: number;
    riskScore: number;
    coveragePercentage?: number;
    dataSource?: string;
  }>
): RecommendationResult {
  if (routes.length === 0) {
    return { recommendedId: "", tradeoffSummaries: {} };
  }

  // 1. Identify baseline fastest route
  const fastest = [...routes].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];

  // Maximum acceptable extra time over the fastest route: max(10, 40% of fastest)
  const maxExtraTime = Math.max(10, Math.round(fastest.durationMinutes * 0.4));

  // 2. Filter acceptable candidates within time threshold
  const acceptableCandidates = routes.filter(
    (r) => r.durationMinutes - fastest.durationMinutes <= maxExtraTime
  );

  // 3. Sort acceptable candidates by:
  //    fewest issues first -> lowest risk score -> shortest duration
  const sortedBySafety = [...acceptableCandidates].sort((a, b) => {
    if (a.reportedIssuesCount !== b.reportedIssuesCount) {
      return a.reportedIssuesCount - b.reportedIssuesCount;
    }
    if (a.riskScore !== b.riskScore) {
      return a.riskScore - b.riskScore;
    }
    return a.durationMinutes - b.durationMinutes;
  });

  const bestCandidate = sortedBySafety[0] || fastest;

  // Rule verification: never recommend fastest if bestCandidate has strictly fewer issues
  const recommendedId = bestCandidate.id;

  const tradeoffSummaries: Record<string, string> = {};

  for (const r of routes) {
    const isNoData = r.dataSource === "no_data_yet" || (r.coveragePercentage !== undefined && r.coveragePercentage === 0);

    if (isNoData) {
      tradeoffSummaries[r.id] = "No reports here yet. Be the first to report.";
      continue;
    }

    if (r.id === recommendedId) {
      if (r.id === fastest.id) {
        if (r.reportedIssuesCount === 0) {
          tradeoffSummaries[r.id] = "Fastest route, fewest reported issues.";
        } else {
          tradeoffSummaries[r.id] = `Fastest route, fewest reported issues (${r.reportedIssuesCount} caution${r.reportedIssuesCount === 1 ? "" : "s"}).`;
        }
      } else {
        const extraMinutes = r.durationMinutes - fastest.durationMinutes;
        const fewerIssues = fastest.reportedIssuesCount - r.reportedIssuesCount;
        if (fewerIssues > 0) {
          tradeoffSummaries[r.id] = `Fewer reported issues, +${extraMinutes} min.`;
        } else {
          tradeoffSummaries[r.id] = `Lower risk exposure, +${extraMinutes} min.`;
        }
      }
    } else {
      // Non-recommended route
      if (r.id === fastest.id) {
        tradeoffSummaries[r.id] = `Fastest route (${r.durationMinutes} min), passes ${r.reportedIssuesCount} reported issue${r.reportedIssuesCount === 1 ? "" : "s"}.`;
      } else {
        const extraMinutes = r.durationMinutes - fastest.durationMinutes;
        tradeoffSummaries[r.id] = `Alternative route (${r.durationMinutes} min, ${r.reportedIssuesCount} reported issue${r.reportedIssuesCount === 1 ? "" : "s"}).`;
      }
    }
  }

  return {
    recommendedId,
    tradeoffSummaries,
  };
}
