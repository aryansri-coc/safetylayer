import test from "node:test";
import assert from "node:assert";
import { fuzzCoordinates } from "../lib/privacy/fuzzing";
import { TrustEngine } from "../lib/trust/engine";
import { getStorageRepository } from "../lib/storage/repository";
import { HazardReport } from "../types";

test("Location Fuzzing: perturb coordinates within 15 to 35 meters", () => {
  const originalLat = 28.6302;
  const originalLng = 77.2248;

  for (let i = 0; i < 20; i++) {
    const fuzzed = fuzzCoordinates(originalLat, originalLng);
    const distMeters = TrustEngine.haversineDistanceMeters(originalLat, originalLng, fuzzed.lat, fuzzed.lng);

    // Assert that every fuzzed coordinate deviates by at least 15m and at most 35m
    assert.ok(
      distMeters >= 15 && distMeters <= 35,
      `Fuzzed distance ${distMeters}m outside expected bounds (15m - 35m)`
    );

    // Assert exact coordinates are NOT identical to raw coordinates
    assert.ok(
      fuzzed.lat !== originalLat || fuzzed.lng !== originalLng,
      "Fuzzed coordinate must not be identical to original point"
    );
  }
});

test("Media Ephemerality: HazardReport stored in database contains 0 raw video or keyframe data", async () => {
  const repo = getStorageRepository();
  const reports = await repo.getHazardReports();

  for (const rep of reports) {
    // Assert no base64 buffers or video payloads are stored in the persistent report object
    assert.strictEqual((rep as any).keyframes, undefined);
    assert.strictEqual((rep as any).videoBase64, undefined);
    assert.strictEqual((rep as any).audioBase64, undefined);
  }
});

test("Public Profile Privacy: profile endpoint serializes aggregate statistics only, never raw GPS trails", async () => {
  const repo = getStorageRepository();
  const profile = await repo.getTrustProfile("user_scout_arjun");

  // Profile must expose only summary aggregates
  assert.ok(typeof profile.kmScouted === "number");
  assert.ok(typeof profile.totalReports === "number");
  assert.ok(Array.isArray(profile.badges));

  // Must NEVER expose raw routes, home coordinates, or individual trip coordinates
  assert.strictEqual((profile as any).rawRoutes, undefined);
  assert.strictEqual((profile as any).homeCoordinates, undefined);
  assert.strictEqual((profile as any).gpsTrail, undefined);
});
