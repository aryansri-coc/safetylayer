import test from "node:test";
import assert from "node:assert";
import { RoutingEngine } from "../lib/routing/engine";
import { RiskModel } from "../lib/risk/model";
import { SEED_ROAD_SEGMENTS, SEED_HAZARD_REPORTS } from "../lib/storage/seed";

test("Time & Diurnal Logic: lighting sensitivity is derived from departure hour, not travel mode", () => {
  // Noon (12:00 PM) - Daylight
  const noonFactor = RiskModel.getTimeOfDayFactor("lighting", 12);
  assert.strictEqual(noonFactor, 0.05); // Daytime streetlights have negligible hazard impact

  // Night (11:00 PM / 23:00) - Nocturnal
  const nightFactor = RiskModel.getTimeOfDayFactor("lighting", 23);
  assert.strictEqual(nightFactor, 1.0); // Full hazard weight at night
});

test("Travel Mode Logic: Two-wheeler vs Pedestrian mode weighting", () => {
  const candidateRoutes = [
    {
      id: "route_test_potholes",
      name: "Broken Road with Potholes",
      durationMinutes: 10,
      distanceKm: 1.5,
      polyline: [
        [28.6315, 77.2235],
        [28.6302, 77.2248],
      ] as [number, number][],
    },
  ];

  const travelTime = new Date();
  travelTime.setHours(14, 0, 0, 0); // 2 PM daylight

  // Score for two-wheeler (where road condition is weighted 2.2x)
  const twoWheelerScored = RoutingEngine.reRankRoutes(
    candidateRoutes,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "two_wheeler",
    travelTime
  );

  // Score for vehicle (driving)
  const vehicleScored = RoutingEngine.reRankRoutes(
    candidateRoutes,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "driving",
    travelTime
  );

  assert.strictEqual(twoWheelerScored.length, 1);
  assert.strictEqual(vehicleScored.length, 1);
  assert.ok(twoWheelerScored[0].riskScore >= vehicleScored[0].riskScore);
});

test("Departure Time: Nocturnal departure increases caution score for unlit corridors", () => {
  const candidateRoutes = [
    {
      id: "route_direct_dark",
      name: "Unlit Service Lane",
      durationMinutes: 14,
      distanceKm: 2.1,
      polyline: [
        [28.6335, 77.2205],
        [28.6302, 77.2248],
        [28.6265, 77.2242],
      ] as [number, number][],
    },
  ];

  const dayDate = new Date();
  dayDate.setHours(12, 0, 0, 0); // Noon

  const nightDate = new Date();
  nightDate.setHours(22, 0, 0, 0); // 10 PM Night

  const dayScored = RoutingEngine.reRankRoutes(
    candidateRoutes,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "walking",
    dayDate
  );

  const nightScored = RoutingEngine.reRankRoutes(
    candidateRoutes,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "walking",
    nightDate
  );

  // Nighttime traversal along the unlit service road must produce higher risk than daytime
  assert.ok(nightScored[0].riskScore > dayScored[0].riskScore);
});
