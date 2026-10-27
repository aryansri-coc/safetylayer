import test from "node:test";
import assert from "node:assert";
import { TrustEngine } from "../lib/trust/engine";
import { GPSPoint, TrustProfile } from "../types";

test("Presence check passes for plausible commuter speed and proximity", () => {
  const target = { lat: 28.6302, lng: 77.2248 };
  const now = Date.now();

  const validTrail: GPSPoint[] = [
    { lat: 28.632, lng: 77.224, timestamp: now - 30000, speedKmh: 18 },
    { lat: 28.631, lng: 77.2245, timestamp: now - 15000, speedKmh: 18 },
    { lat: 28.6302, lng: 77.2248, timestamp: now, speedKmh: 18 },
  ];

  const result = TrustEngine.verifyPresence(target, validTrail);
  assert.strictEqual(result.passed, true);
  assert.ok(result.averageSpeedKmh > 5 && result.averageSpeedKmh < 50);
});

test("Presence check rejects impossible aircraft speed (> 90 km/h) or teleportation", () => {
  const target = { lat: 28.6302, lng: 77.2248 };
  const now = Date.now();

  const spoofedTrail: GPSPoint[] = [
    { lat: 28.6302, lng: 77.2248, timestamp: now - 1000 },
    { lat: 28.95, lng: 77.45, timestamp: now }, // 40 km covered in 1 second!
  ];

  const result = TrustEngine.verifyPresence(target, spoofedTrail);
  assert.strictEqual(result.passed, false);
});

test("Beta distribution reputation score updates properly", () => {
  const profile: TrustProfile = {
    userId: "test_user",
    alpha: 2,
    beta: 2,
    reliabilityScore: 0.5,
    totalReports: 0,
    verifiedReports: 0,
    kmScouted: 0,
    badges: [],
    lastActive: new Date().toISOString(),
  };

  // User report verified
  const updated1 = TrustEngine.updateReporterReliability(profile, true);
  assert.strictEqual(updated1.alpha, 3);
  assert.strictEqual(updated1.beta, 2);
  assert.strictEqual(updated1.reliabilityScore, 0.6);

  // Another report verified
  const updated2 = TrustEngine.updateReporterReliability(updated1, true);
  assert.strictEqual(updated2.alpha, 4);
  assert.strictEqual(updated2.reliabilityScore, 0.67);
});
