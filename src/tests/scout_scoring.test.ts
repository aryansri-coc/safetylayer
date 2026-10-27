import test from "node:test";
import assert from "node:assert";
import { ScoutScoringEngine, DAILY_CREDIT_CAP } from "../lib/scout/scoring";
import { TrustProfile } from "../types";

function createMockProfile(userId: string): TrustProfile {
  return {
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
    lastCreditDate: "2026-10-27",
    pendingUnconfirmedScouts: 0,
    vestedCorroboratedPoints: 0,
  };
}

test("Scout submission alone awards 0 vested points (anti-volume rule)", () => {
  let profile = createMockProfile("rider_arjun");
  const result = ScoutScoringEngine.recordSubmission(profile, 0.5);

  assert.strictEqual(result.vestedPointsAwarded, 0);
  assert.strictEqual(result.status, "pending_corroboration");
  assert.strictEqual(result.profile.pendingUnconfirmedScouts, 1);
  assert.strictEqual(result.profile.vestedCorroboratedPoints, 0);
});

test("High-volume uncorroborated spammer earns strictly less than an accurate low-volume scout", () => {
  // Spammer submits 50 reports without corroboration
  let spammer = createMockProfile("spammer_bot");
  for (let i = 0; i < 50; i++) {
    const res = ScoutScoringEngine.recordSubmission(spammer, 0.4);
    spammer = res.profile;
  }

  // Spammer unconfirmed reports get contradicted by real travelers
  for (let i = 0; i < 5; i++) {
    const con = ScoutScoringEngine.contradictReport(spammer);
    spammer = con.profile;
  }

  // Accurate scout submits only 3 reports, which all get corroborated
  let accurateScout = createMockProfile("careful_rider");
  for (let i = 0; i < 3; i++) {
    const res = ScoutScoringEngine.recordSubmission(accurateScout, 0.4);
    accurateScout = res.profile;
  }
  for (let i = 0; i < 3; i++) {
    const cor = ScoutScoringEngine.corroborateReport(accurateScout, 25, "2026-10-27");
    accurateScout = cor.profile;
  }

  // Assertions:
  // 1. Spammer has 0 vested points (or 0 after deductions)
  assert.strictEqual(spammer.vestedCorroboratedPoints, 0);

  // 2. Accurate scout has 75 vested points
  assert.strictEqual(accurateScout.vestedCorroboratedPoints, 75);

  // 3. Accurate scout reliability score (alpha/(alpha+beta)) is significantly higher than spammer
  assert.ok(accurateScout.reliabilityScore > spammer.reliabilityScore);
  assert.ok(spammer.reliabilityScore < 0.35); // Degraded to ~0.28
});

test("Daily credit cap limits reward accumulation to 100 points per cycle", () => {
  let scout = createMockProfile("marathon_scout");

  // Attempt to corroborate 6 reports in the same day (6 * 25 = 150 points)
  for (let i = 0; i < 6; i++) {
    const res = ScoutScoringEngine.recordSubmission(scout, 0.4);
    scout = res.profile;
    const cor = ScoutScoringEngine.corroborateReport(scout, 25, "2026-10-27");
    scout = cor.profile;
  }

  // Should cap exactly at DAILY_CREDIT_CAP (100)
  assert.strictEqual(scout.vestedCorroboratedPoints, DAILY_CREDIT_CAP);
  assert.strictEqual(scout.dailyCreditsEarned, DAILY_CREDIT_CAP);
});
