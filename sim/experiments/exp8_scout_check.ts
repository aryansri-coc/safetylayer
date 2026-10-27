import { ScoutScoringEngine } from "@/lib/scout/scoring";
import { TrustProfile } from "@/types";

export interface ScoutComparisonResult {
  accurateScout: {
    submittedCount: number;
    corroboratedCount: number;
    initialVestedPoints: number;
    finalVestedPoints: number;
    dailyCapApplied: boolean;
  };
  spammer: {
    submittedCount: number;
    corroboratedCount: number;
    unconfirmedPendingCount: number;
    contradictedCount: number;
    initialVestedPoints: number;
    finalVestedPoints: number;
    penaltiesIncurred: number;
  };
  spammerEarnsStrictlyLess: boolean;
  scoutAdvantageMultiplier: number;
}

export function runExp8ScoutCheck(seed: number): ScoutComparisonResult {
  // 1. Accurate Scout: 4 high-quality submissions
  let accurateProfile: TrustProfile = {
    userId: `scout_accurate_${seed}`,
    alpha: 5,
    beta: 1,
    reliabilityScore: 0.83,
    totalReports: 6,
    verifiedReports: 5,
    kmScouted: 14.5,
    badges: ["Night Owl"],
    lastActive: new Date().toISOString(),
    dailyCreditsEarned: 0,
    lastCreditDate: "2026-10-26",
    pendingUnconfirmedScouts: 0,
    vestedCorroboratedPoints: 0,
  };

  for (let i = 0; i < 4; i++) {
    const res = ScoutScoringEngine.awardScoutAssessment(accurateProfile, {
      isStationaryLocked: true,
      stationaryDurationSeconds: 4.5,
      segmentId: `seg_valid_${i}`,
      issueReported: "lighting",
    });
    accurateProfile = res.updatedProfile;
  }

  // All 4 get corroborated later by independent drivers
  const corrobRes = ScoutScoringEngine.vestCorroboratedScouts(accurateProfile, 4, 0);
  accurateProfile = corrobRes.updatedProfile;

  // 2. High-Volume Spammer: Submits 45 rapid reports to farm points
  let spammerProfile: TrustProfile = {
    userId: `spammer_bot_${seed}`,
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
  };

  for (let i = 0; i < 45; i++) {
    const res = ScoutScoringEngine.awardScoutAssessment(spammerProfile, {
      isStationaryLocked: true,
      stationaryDurationSeconds: 3.5,
      segmentId: `seg_spam_${i}`,
      issueReported: "lighting",
    });
    spammerProfile = res.updatedProfile;
  }

  // Spammer reports remain uncorroborated, and 3 are actively contradicted by trusted commuters
  const spamCorrobRes = ScoutScoringEngine.vestCorroboratedScouts(spammerProfile, 0, 3);
  spammerProfile = spamCorrobRes.updatedProfile;

  const spammerEarnsLess = spammerProfile.vestedCorroboratedPoints < accurateProfile.vestedCorroboratedPoints;
  const advantageMultiplier = accurateProfile.vestedCorroboratedPoints / Math.max(1, spammerProfile.vestedCorroboratedPoints);

  return {
    accurateScout: {
      submittedCount: 4,
      corroboratedCount: 4,
      initialVestedPoints: 0,
      finalVestedPoints: accurateProfile.vestedCorroboratedPoints,
      dailyCapApplied: accurateProfile.dailyCreditsEarned >= 100,
    },
    spammer: {
      submittedCount: 45,
      corroboratedCount: 0,
      unconfirmedPendingCount: spammerProfile.pendingUnconfirmedScouts ?? 45,
      contradictedCount: 3,
      initialVestedPoints: 0,
      finalVestedPoints: spammerProfile.vestedCorroboratedPoints,
      penaltiesIncurred: spamCorrobRes.penaltiesDeducted,
    },
    spammerEarnsStrictlyLess: spammerEarnsLess,
    scoutAdvantageMultiplier: Number(advantageMultiplier.toFixed(2)),
  };
}
