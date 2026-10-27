import { RiskModel } from "@/lib/risk/model";
import { HazardReport, StreetViewPrior } from "@/types";
import { toHazardReport, WorldGraph, WorldSegment } from "../world/types";

export interface HourlyTemporalEvaluation {
  hour: number;
  groundTruthActive: boolean;
  predictedRiskScore: number;
  diurnalFactor: number;
}

export interface DecayEvaluationPoint {
  daysAfterFix: number;
  groundTruthActive: boolean;
  effectiveRiskScore: number;
  decayPercentage: number;
}

export interface Exp4Result {
  lightingDiurnalProfile: HourlyTemporalEvaluation[];
  hourlyMAE: number;
  repairDecayProfile: DecayEvaluationPoint[];
  staleDisappearanceDays: number; // days until risk drops < 0.1 above baseline
}

export function runExp4Temporal(world: WorldGraph): Exp4Result {
  // 1. Evaluate Diurnal Lighting Hazard Across 24 Hours
  const testSegment = world.segments[0];
  const prior = testSegment.streetviewPrior;

  // Single active lighting report reported at night
  const lightingReport = toHazardReport({
    id: "rep_temp_lighting",
    userId: "user_test",
    segmentId: testSegment.id,
    coordinates: prior.coordinates,
    timestamp: "2026-10-20T22:00:00Z",
    issue: "lighting",
    timeRelevance: "night",
    severity: 5,
    confidence: 0.95,
    status: "published",
    presenceVerified: true,
  });

  const diurnalProfile: HourlyTemporalEvaluation[] = [];
  let totalError = 0;

  for (let hour = 0; hour < 24; hour++) {
    const isGroundTruthNight = hour >= 19 || hour < 6;
    const factor = RiskModel.getTimeOfDayFactor("lighting", hour);
    const risk = RiskModel.calculateSegmentRisk(testSegment.id, prior, [lightingReport], hour);

    const gtActive = isGroundTruthNight;
    const error = Math.abs(risk.compositeRiskScore - (gtActive ? 0.8 : 0.2));
    totalError += error;

    diurnalProfile.push({
      hour,
      groundTruthActive: gtActive,
      predictedRiskScore: Number(risk.compositeRiskScore.toFixed(3)),
      diurnalFactor: factor,
    });
  }

  // 2. Evaluate Stale Hazard Decay after Day 5 Fix (Obstruction & Lighting)
  // Obstruction half-life: 12 hours. Lighting half-life: 72 hours (3 days).
  const baselineRisk = RiskModel.calculateSegmentRisk(testSegment.id, prior, [], 22).compositeRiskScore;
  const initialTime = new Date("2026-10-15T12:00:00Z").getTime();

  const reportTime = new Date(initialTime).toISOString();
  const obstructionReport = toHazardReport({
    id: "rep_temp_obstruction",
    userId: "user_test",
    segmentId: testSegment.id,
    coordinates: prior.coordinates,
    timestamp: reportTime,
    issue: "obstruction",
    timeRelevance: "always",
    severity: 5,
    confidence: 0.95,
    status: "published",
    presenceVerified: true,
  });

  const decayProfile: DecayEvaluationPoint[] = [];
  let staleDays = 14;

  const testDays = [0, 0.5, 1, 2, 3, 5, 7, 10, 14];
  for (const daysAfter of testDays) {
    const queryTime = new Date(initialTime + daysAfter * 86400000);
    const queryHour = queryTime.getHours();

    // In production, calculateSegmentRisk computes age relative to new Date().
    // We simulate age by passing an adjusted timestamp in past
    const simulatedPastReport: HazardReport = {
      ...obstructionReport,
      timestamp: new Date(Date.now() - daysAfter * 86400000).toISOString(),
    };

    const risk = RiskModel.calculateSegmentRisk(testSegment.id, prior, [simulatedPastReport], 22);
    const elevatedRisk = risk.compositeRiskScore - baselineRisk;
    const maxElevated = 0.65; // peak obstruction elevation
    const decayPct = Math.max(0, Math.min(100, Math.round((1 - elevatedRisk / maxElevated) * 100)));

    if (elevatedRisk < 0.08 && staleDays === 14 && daysAfter > 0) {
      staleDays = daysAfter;
    }

    decayProfile.push({
      daysAfterFix: daysAfter,
      groundTruthActive: daysAfter === 0,
      effectiveRiskScore: Number(risk.compositeRiskScore.toFixed(3)),
      decayPercentage: decayPct,
    });
  }

  return {
    lightingDiurnalProfile: diurnalProfile,
    hourlyMAE: Number((totalError / 24).toFixed(4)),
    repairDecayProfile: decayProfile,
    staleDisappearanceDays: staleDays,
  };
}
