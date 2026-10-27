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

test("A5: evaluateScoutPrompt enforces proximity, stationary lock, diurnal window, and neutral wording", () => {
  const { evaluateScoutPrompt } = require("../lib/scout/prompts");

  const mockSegments = [
    { id: "seg_cp", name: "Barakhamba Service Road" },
  ];

  const mockReports = [
    {
      id: "rep_night_light",
      segmentId: "seg_cp",
      issue: "lighting",
      status: "published",
      timeRelevance: "night",
      coordinates: { lat: 28.6315, lng: 77.2235 },
    },
  ];

  // 1. User moving at 15 km/h -> MUST REJECT (never prompt while moving)
  const movingResult = evaluateScoutPrompt(mockReports, mockSegments, {
    userCoords: { lat: 28.6315, lng: 77.2235 },
    speedKmh: 15,
    stationarySeconds: 0,
    currentHour: 21,
  });
  assert.strictEqual(movingResult, null, "Must not prompt while user is moving");

  // 2. User far away (> 150m) -> MUST REJECT
  const farAwayResult = evaluateScoutPrompt(mockReports, mockSegments, {
    userCoords: { lat: 28.6400, lng: 77.2300 }, // ~1 km away
    speedKmh: 0,
    stationarySeconds: 10,
    currentHour: 21,
  });
  assert.strictEqual(farAwayResult, null, "Must not prompt outside 150m radius");

  // 3. User close and stationary, but daytime (14:00) for night report -> MUST REJECT
  const daytimeResult = evaluateScoutPrompt(mockReports, mockSegments, {
    userCoords: { lat: 28.6315, lng: 77.2235 },
    speedKmh: 0,
    stationarySeconds: 10,
    currentHour: 14, // 2 PM daylight
  });
  assert.strictEqual(daytimeResult, null, "Must not prompt for night streetlight in daylight");

  // 4. User close (<150m), stationary >= 5s, night time (21:00) -> SUCCESS WITH NEUTRAL WORDING
  const successResult = evaluateScoutPrompt(mockReports, mockSegments, {
    userCoords: { lat: 28.6315, lng: 77.2235 },
    speedKmh: 0,
    stationarySeconds: 6,
    currentHour: 21,
  });
  assert.ok(successResult);
  assert.strictEqual(successResult.segmentName, "Barakhamba Service Road");
  assert.ok(successResult.promptText.includes("reported after 8 PM"));
  assert.ok(successResult.promptText.includes("Can you confirm this? Your answer helps keep the info accurate."));
  assert.ok(!successResult.promptText.includes("pts")); // NO volume point incentives!
});

