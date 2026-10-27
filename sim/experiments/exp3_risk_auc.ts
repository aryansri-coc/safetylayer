import { RiskModel } from "@/lib/risk/model";
import { HazardIssue, HazardReport, StreetViewPrior } from "@/types";
import { SimulatedReportPayload } from "../population/types";
import { toHazardReport, WorldGraph } from "../world/types";

export interface LearningCurvePoint {
  day: number;
  reportCount: number;
  overallAUC: number;
  byHazardAUC: Record<HazardIssue, number>;
}

export interface Exp3Result {
  learningCurve: LearningCurvePoint[];
}

export function computeROCAUC(scores: { score: number; label: number }[]): number {
  const positives = scores.filter((s) => s.label === 1);
  const negatives = scores.filter((s) => s.label === 0);

  if (positives.length === 0 || negatives.length === 0) {
    return 0.5; // Undefined / random baseline if no positive or no negative class
  }

  // Sort by score ascending
  const sorted = [...scores].sort((a, b) => a.score - b.score);

  // Assign ranks with tie handling
  let rankSumPos = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].score === sorted[i].score) {
      j++;
    }
    const averageRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      if (sorted[k].label === 1) {
        rankSumPos += averageRank;
      }
    }
    i = j;
  }

  const nPos = positives.length;
  const nNeg = negatives.length;
  const u = rankSumPos - (nPos * (nPos + 1)) / 2;
  const auc = u / (nPos * nNeg);

  return Math.min(1.0, Math.max(0.0, Number(auc.toFixed(4))));
}

export function runExp3RiskAUC(
  reports: SimulatedReportPayload[],
  world: WorldGraph
): Exp3Result {
  const queryHour = 22; // Late night evaluation (where lighting and isolation matter most)
  const daysToCheck = [0, 3, 7, 14];
  const learningCurve: LearningCurvePoint[] = [];

  const issues: HazardIssue[] = ["lighting", "road_condition", "footpath_missing", "isolated_stretch", "obstruction"];

  for (const day of daysToCheck) {
    // Collect published reports up to this day
    const activeReports: HazardReport[] = reports
      .filter((r) => r.dayIndex <= day && r.isTruthful)
      .map((r) =>
        toHazardReport({
          id: r.reportId,
          userId: r.userId,
          segmentId: r.segmentId,
          coordinates: r.coordinates,
          timestamp: r.timestamp,
          issue: r.issue,
          timeRelevance: r.issue === "lighting" ? "night" : "always",
          severity: r.severity as 1 | 2 | 3 | 4 | 5,
          confidence: 0.85,
          status: "published",
          presenceVerified: true,
        })
      );

    const overallPairs: { score: number; label: number }[] = [];
    const byHazardPairs: Record<HazardIssue, { score: number; label: number }[]> = {
      lighting: [],
      road_condition: [],
      footpath_missing: [],
      isolated_stretch: [],
      obstruction: [],
      other: [],
    };

    for (const seg of world.segments) {
      // Real RiskModel execution
      const risk = RiskModel.calculateSegmentRisk(
        seg.id,
        seg.streetviewPrior,
        activeReports,
        queryHour
      );

      // Check ground truth state on segment at day and queryHour
      const activeGtHazards = seg.groundTruthHazards.filter((h) => {
        if (day < h.appearDay) return false;
        if (h.fixedDay !== undefined && day >= h.fixedDay) return false;
        if (h.timeProfile === "night_only" && (queryHour < 19 && queryHour >= 6)) return false;
        return true;
      });

      const isHazardous = activeGtHazards.length > 0 ? 1 : 0;
      overallPairs.push({ score: risk.compositeRiskScore, label: isHazardous });

      for (const iss of issues) {
        const hasIssue = activeGtHazards.some((h) => h.issue === iss) ? 1 : 0;
        const issScore = risk.hazardBreakdown[iss] ?? 0;
        byHazardPairs[iss].push({ score: issScore, label: hasIssue });
      }
    }

    const overallAUC = computeROCAUC(overallPairs);
    const byHazardAUC: Record<HazardIssue, number> = {} as any;
    for (const iss of issues) {
      byHazardAUC[iss] = computeROCAUC(byHazardPairs[iss]);
    }

    learningCurve.push({
      day,
      reportCount: activeReports.length,
      overallAUC,
      byHazardAUC,
    });
  }

  return { learningCurve };
}
