import { TrustProfile } from "@/types";

export const DAILY_CREDIT_CAP = 100;
export const POINTS_PER_CORROBORATION = 25;
export const PENALTY_CONTRADICTION = 30;

export class ScoutScoringEngine {
  /**
   * Log a new scout verification.
   * HONESTY RULE: Credit does NOT vest on submission volume.
   * Unconfirmed scouts sit in pending queue and award 0 vested points.
   */
  static recordSubmission(
    profile: TrustProfile,
    distanceKm = 0.4
  ): { profile: TrustProfile; vestedPointsAwarded: number; status: string } {
    const updated: TrustProfile = {
      ...profile,
      totalReports: profile.totalReports + 1,
      kmScouted: Math.round((profile.kmScouted + distanceKm) * 10) / 10,
      pendingUnconfirmedScouts: profile.pendingUnconfirmedScouts + 1,
      lastActive: new Date().toISOString(),
    };

    return {
      profile: updated,
      vestedPointsAwarded: 0,
      status: "pending_corroboration",
    };
  }

  /**
   * Vest credit only when a subsequent independent traveler or municipal data corroborates accuracy.
   * Daily cap: 100 points maximum per 24-hour cycle.
   */
  static corroborateReport(
    profile: TrustProfile,
    basePoints = POINTS_PER_CORROBORATION,
    currentDate = new Date().toISOString().slice(0, 10)
  ): { profile: TrustProfile; vestedPointsAwarded: number; hitDailyCap: boolean } {
    let dailyEarned = profile.dailyCreditsEarned;
    if (profile.lastCreditDate !== currentDate) {
      dailyEarned = 0; // Reset on new day
    }

    const availableDaily = Math.max(0, DAILY_CREDIT_CAP - dailyEarned);
    const awarded = Math.min(basePoints, availableDaily);

    const newAlpha = profile.alpha + 1;
    const reliability = Math.round((newAlpha / (newAlpha + profile.beta)) * 100) / 100;

    const updated: TrustProfile = {
      ...profile,
      alpha: newAlpha,
      reliabilityScore: reliability,
      verifiedReports: profile.verifiedReports + 1,
      pendingUnconfirmedScouts: Math.max(0, profile.pendingUnconfirmedScouts - 1),
      dailyCreditsEarned: dailyEarned + awarded,
      lastCreditDate: currentDate,
      vestedCorroboratedPoints: profile.vestedCorroboratedPoints + awarded,
      lastActive: new Date().toISOString(),
    };

    return {
      profile: updated,
      vestedPointsAwarded: awarded,
      hitDailyCap: availableDaily <= 0,
    };
  }

  /**
   * Contradict an inaccurate scout report: penalize Bayesian reliability (beta + 1)
   * and deduct vested points.
   */
  static contradictReport(
    profile: TrustProfile,
    penalty = PENALTY_CONTRADICTION
  ): { profile: TrustProfile; pointsDeducted: number } {
    const newBeta = profile.beta + 1;
    const reliability = Math.round((profile.alpha / (profile.alpha + newBeta)) * 100) / 100;

    const updated: TrustProfile = {
      ...profile,
      beta: newBeta,
      reliabilityScore: reliability,
      pendingUnconfirmedScouts: Math.max(0, profile.pendingUnconfirmedScouts - 1),
      vestedCorroboratedPoints: Math.max(0, profile.vestedCorroboratedPoints - penalty),
      lastActive: new Date().toISOString(),
    };

    return {
      profile: updated,
      pointsDeducted: penalty,
    };
  }

  static awardScoutAssessment(
    profile: TrustProfile,
    _opts?: { isStationaryLocked?: boolean; stationaryDurationSeconds?: number; segmentId?: string; issueReported?: string }
  ): { updatedProfile: TrustProfile; vestedPointsAwarded: number; status: string } {
    const res = this.recordSubmission(profile);
    return {
      updatedProfile: res.profile,
      vestedPointsAwarded: res.vestedPointsAwarded,
      status: res.status,
    };
  }

  static vestCorroboratedScouts(
    profile: TrustProfile,
    corroboratedCount: number,
    contradictedCount = 0,
    currentDate = new Date().toISOString().slice(0, 10)
  ): { updatedProfile: TrustProfile; pointsVested: number; penaltiesDeducted: number } {
    let current = profile;
    let pointsVested = 0;
    let penaltiesDeducted = 0;

    for (let i = 0; i < corroboratedCount; i++) {
      const res = this.corroborateReport(current, POINTS_PER_CORROBORATION, currentDate);
      current = res.profile;
      pointsVested += res.vestedPointsAwarded;
    }

    for (let i = 0; i < contradictedCount; i++) {
      const res = this.contradictReport(current);
      current = res.profile;
      penaltiesDeducted += res.pointsDeducted;
    }

    return {
      updatedProfile: current,
      pointsVested,
      penaltiesDeducted,
    };
  }
}
