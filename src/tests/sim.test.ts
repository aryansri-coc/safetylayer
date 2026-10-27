import { test } from "node:test";
import assert from "node:assert";
import { createWorldGraph } from "../../sim/world/graph";
import { createPopulation, generateGpsTrail } from "../../sim/population/archetypes";
import { SeededRNG } from "../../sim/world/seeded_rng";
import { TrustEngine } from "../lib/trust/engine";
import { RiskModel } from "../lib/risk/model";
import { runExp8ScoutCheck } from "../../sim/experiments/exp8_scout_check";

test("Simulator Determinism: Same seed yields identical world and ground truth", () => {
  const seed = 12345;
  const world1 = createWorldGraph(seed, { type: "corridor", hazardDensity: 0.5 });
  const world2 = createWorldGraph(seed, { type: "corridor", hazardDensity: 0.5 });

  assert.strictEqual(world1.segments.length, world2.segments.length);
  for (let i = 0; i < world1.segments.length; i++) {
    const s1 = world1.segments[i];
    const s2 = world2.segments[i];
    assert.strictEqual(s1.id, s2.id);
    assert.strictEqual(s1.groundTruthHazards.length, s2.groundTruthHazards.length);
    for (let j = 0; j < s1.groundTruthHazards.length; j++) {
      assert.strictEqual(s1.groundTruthHazards[j].issue, s2.groundTruthHazards[j].issue);
      assert.strictEqual(s1.groundTruthHazards[j].trueSeverity, s2.groundTruthHazards[j].trueSeverity);
    }
  }

  // Different seed should yield different hazard placement or severity
  const world3 = createWorldGraph(99999, { type: "corridor", hazardDensity: 0.5 });
  const hazards1 = world1.segments.flatMap((s) => s.groundTruthHazards).map((h) => h.id).join(",");
  const hazards3 = world3.segments.flatMap((s) => s.groundTruthHazards).map((h) => h.id).join(",");
  assert.notStrictEqual(hazards1, hazards3, "Different seeds must produce different hazard IDs");
});

test("Attacker Behavior: Malicious single fails physical presence check (> 70m limit)", () => {
  const rng = new SeededRNG(42);
  const world = createWorldGraph(42, { type: "corridor" });
  const targetSeg = world.segments[0];
  const targetCoord = { lat: targetSeg.coordinates[0][0], lng: targetSeg.coordinates[0][1] };

  // Malicious single generates far away trail (tampered: 'far_away')
  const trail = generateGpsTrail(targetSeg, Date.now(), 20, 5, rng, "far_away");
  const presence = TrustEngine.verifyPresence(targetCoord, trail);

  assert.strictEqual(presence.passed, false, "Remote malicious report must fail physical presence");
  assert.ok(presence.reason?.includes("closest point was"), "Reason must cite distance mismatch");
});

test("Attacker Behavior: GPS spoofer fails transit velocity bounds (> 90 km/h)", () => {
  const rng = new SeededRNG(42);
  const world = createWorldGraph(42, { type: "corridor" });
  const targetSeg = world.segments[0];
  const targetCoord = { lat: targetSeg.coordinates[0][0], lng: targetSeg.coordinates[0][1] };

  // Spoofer fabricates trail with impossible teleport / extreme speed
  const trail = generateGpsTrail(targetSeg, Date.now(), 20, 5, rng, "speeding");
  const presence = TrustEngine.verifyPresence(targetCoord, trail);

  assert.strictEqual(presence.passed, false, "Speeding / teleporting GPS spoofer must fail presence");
  assert.ok(presence.reason?.includes("Implausible transit velocity"), "Reason must cite implausible speed");
});

test("Ground Truth Hidden Isolation: RiskModel cannot see or depend on groundTruthHazards", () => {
  const world = createWorldGraph(42, { type: "corridor" });
  const seg = world.segments[0];

  // Pass only the public StreetViewPrior and public reports to production RiskModel
  const risk = RiskModel.calculateSegmentRisk(seg.id, seg.streetviewPrior, [], 22);

  // Assert risk return does not contain groundTruthHazards
  assert.strictEqual(typeof risk.compositeRiskScore, "number");
  assert.strictEqual((risk as any).groundTruthHazards, undefined, "Ground truth hazards must be hidden from RiskModel");
  assert.ok(risk.compositeRiskScore >= 0.0 && risk.compositeRiskScore <= 1.0);
});

test("Scout Anti-Volume Incentive: Spammer earns strictly less than accurate scout", () => {
  const result = runExp8ScoutCheck(42);
  assert.strictEqual(result.spammerEarnsStrictlyLess, true, "Volume spammer must earn less than accurate scout");
  assert.ok(result.scoutAdvantageMultiplier > 1.0, "Accurate scout must have positive advantage multiplier");
});
