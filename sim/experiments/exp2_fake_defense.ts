import { TrustEngine } from "@/lib/trust/engine";
import { HazardReport, TrustProfile } from "@/types";
import { AgentArchetype, SimulatedReportPayload } from "../population/types";
import { toHazardReport, WorldGraph } from "../world/types";

export interface DefenseMetrics {
  totalSubmitted: number;
  falseReportsSubmitted: number;
  genuineReportsSubmitted: number;
  rejectedFalseReports: number; // TP
  acceptedFalseReports: number; // FN (Leakage)
  rejectedGenuineReports: number; // FP
  acceptedGenuineReports: number; // TN
  precision: number;
  recall: number;
  f1Score: number;
}

export interface Exp2Result {
  overall: DefenseMetrics;
  byAttackerType: Record<string, DefenseMetrics>;
}

export function runExp2FakeDefense(
  reports: SimulatedReportPayload[],
  world: WorldGraph
): Exp2Result {
  const publishedReports: HazardReport[] = [];
  const userProfiles = new Map<string, TrustProfile>();

  const getProfile = (userId: string): TrustProfile => {
    if (!userProfiles.has(userId)) {
      userProfiles.set(userId, {
        userId,
        alpha: 2,
        beta: 2,
        reliabilityScore: 0.5,
        totalReports: 0,
        verifiedReports: 0,
        kmScouted: 0,
        badges: [],
        lastActive: new Date().toISOString(),
        dailyCreditsEarned: 0,
        lastCreditDate: "2026-10-26",
        pendingUnconfirmedScouts: 0,
        vestedCorroboratedPoints: 0,
      });
    }
    return userProfiles.get(userId)!;
  };

  const byType: Record<string, { tp: number; fn: number; fp: number; tn: number; total: number; falseCount: number; genuineCount: number }> = {};

  const ensureType = (arch: string) => {
    if (!byType[arch]) {
      byType[arch] = { tp: 0, fn: 0, fp: 0, tn: 0, total: 0, falseCount: 0, genuineCount: 0 };
    }
  };

  for (const rep of reports) {
    const arch = rep.userArchetype;
    ensureType(arch);
    byType[arch].total++;

    const isFalse = !rep.isTruthful;
    if (isFalse) {
      byType[arch].falseCount++;
    } else {
      byType[arch].genuineCount++;
    }

    const profile = getProfile(rep.userId);

    // Call REAL production TrustEngine modules
    // 1. Presence check
    const presence = TrustEngine.verifyPresence(rep.coordinates, rep.gpsTrail);

    // 2. Cross-modal consistency check
    const isNocturnal = rep.hourOfDay >= 19 || rep.hourOfDay < 6;
    const consistency = TrustEngine.verifyCrossModalConsistency(
      rep.issue,
      rep.issue === "lighting" ? "night" : "always",
      rep.timestamp,
      !isNocturnal
    );

    // 3. Collusion check
    const collusion = TrustEngine.detectCollusion(
      { coordinates: rep.coordinates, userId: rep.userId, timestamp: rep.timestamp },
      publishedReports,
      15,
      80
    );

    // Decision logic using SafetyLayer production rules
    let rejected = false;
    let rejectReason = "";

    if (!presence.passed) {
      rejected = true;
      rejectReason = presence.reason || "Presence failed";
    } else if (collusion.isCollusionSuspected) {
      rejected = true;
      rejectReason = collusion.reason || "Collusion suspected";
    } else if (!consistency.passed) {
      rejected = true;
      rejectReason = consistency.flaggedMismatch || "Cross-modal mismatch";
    } else if (rep.severity >= 4 && profile.reliabilityScore < 0.65) {
      // High severity from untrusted new reporter requires corroboration
      const dummyReport = toHazardReport({
        id: rep.reportId,
        userId: rep.userId,
        segmentId: rep.segmentId,
        coordinates: rep.coordinates,
        timestamp: rep.timestamp,
        issue: rep.issue,
        timeRelevance: rep.issue === "lighting" ? "night" : "always",
        severity: rep.severity as 1 | 2 | 3 | 4 | 5,
        confidence: 0.8,
        status: "verification_queue",
        presenceVerified: presence.passed,
      });

      const corroborated = TrustEngine.isCorroborated(dummyReport, profile.reliabilityScore, publishedReports);
      if (!corroborated) {
        // Held in quarantine / discounted
        rejected = true;
        rejectReason = "Uncorroborated severe report from low-trust reporter";
      }
    }

    // Evaluate against ground truth
    if (isFalse) {
      if (rejected) {
        byType[arch].tp++; // Correctly caught attack
      } else {
        byType[arch].fn++; // Attack leaked through!
      }
    } else {
      if (rejected) {
        byType[arch].fp++; // Genuine contributor erroneously blocked
      } else {
        byType[arch].tn++; // Genuine report accepted
      }
    }

    // If accepted, add to published pool and update profile
    if (!rejected) {
      publishedReports.push(toHazardReport({
        id: rep.reportId,
        userId: rep.userId,
        segmentId: rep.segmentId,
        coordinates: rep.coordinates,
        timestamp: rep.timestamp,
        issue: rep.issue,
        timeRelevance: rep.issue === "lighting" ? "night" : "always",
        severity: rep.severity as 1 | 2 | 3 | 4 | 5,
        confidence: 0.85,
        status: "published",
        presenceVerified: true,
      }));

      // Update reporter profile
      userProfiles.set(rep.userId, TrustEngine.updateReporterReliability(profile, rep.isTruthful));
    } else {
      userProfiles.set(rep.userId, TrustEngine.updateReporterReliability(profile, false));
    }
  }

  // Calculate precision, recall, F1
  let totalTp = 0, totalFn = 0, totalFp = 0, totalTn = 0, totalFalse = 0, totalGen = 0, totalSub = 0;
  const byAttackerType: Record<string, DefenseMetrics> = {};

  for (const [arch, stats] of Object.entries(byType)) {
    const prec = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 1.0;
    const rec = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 0.0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0.0;

    byAttackerType[arch] = {
      totalSubmitted: stats.total,
      falseReportsSubmitted: stats.falseCount,
      genuineReportsSubmitted: stats.genuineCount,
      rejectedFalseReports: stats.tp,
      acceptedFalseReports: stats.fn,
      rejectedGenuineReports: stats.fp,
      acceptedGenuineReports: stats.tn,
      precision: Number((prec * 100).toFixed(2)),
      recall: Number((rec * 100).toFixed(2)),
      f1Score: Number((f1 * 100).toFixed(2)),
    };

    totalTp += stats.tp;
    totalFn += stats.fn;
    totalFp += stats.fp;
    totalTn += stats.tn;
    totalFalse += stats.falseCount;
    totalGen += stats.genuineCount;
    totalSub += stats.total;
  }

  const overallPrec = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1.0;
  const overallRec = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 0.0;
  const overallF1 = overallPrec + overallRec > 0 ? (2 * overallPrec * overallRec) / (overallPrec + overallRec) : 0.0;

  return {
    overall: {
      totalSubmitted: totalSub,
      falseReportsSubmitted: totalFalse,
      genuineReportsSubmitted: totalGen,
      rejectedFalseReports: totalTp,
      acceptedFalseReports: totalFn,
      rejectedGenuineReports: totalFp,
      acceptedGenuineReports: totalTn,
      precision: Number((overallPrec * 100).toFixed(2)),
      recall: Number((overallRec * 100).toFixed(2)),
      f1Score: Number((overallF1 * 100).toFixed(2)),
    },
    byAttackerType,
  };
}
