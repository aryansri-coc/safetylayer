import test from "node:test";
import assert from "node:assert";
import { RoutingEngine } from "../lib/routing/engine";
import { SEED_HAZARD_REPORTS, SEED_ROAD_SEGMENTS } from "../lib/storage/seed";

test("RoutingEngine re-ranks alternatives and recommends safer trade-off route", () => {
  const candidateRoutes = [
    {
      id: "route_direct_dark",
      name: "Direct Service Lane (High Hazard)",
      durationMinutes: 14,
      distanceKm: 2.1,
      polyline: [
        [28.6335, 77.2205],
        [28.6302, 77.2248],
        [28.6265, 77.2242],
      ] as [number, number][],
    },
    {
      id: "route_commercial_lit",
      name: "Commercial Corridor (Safer Alternative)",
      durationMinutes: 17,
      distanceKm: 2.5,
      polyline: [
        [28.6335, 77.2205],
        [28.6272, 77.2185],
        [28.6252, 77.2215],
      ] as [number, number][],
    },
  ];

  const nightTime = new Date();
  nightTime.setHours(22, 0, 0, 0);

  const scored = RoutingEngine.reRankRoutes(
    candidateRoutes,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "night_commute",
    nightTime
  );

  assert.strictEqual(scored.length, 2);

  const direct = scored.find((r) => r.id === "route_direct_dark");
  const commercial = scored.find((r) => r.id === "route_commercial_lit");

  assert.ok(direct);
  assert.ok(commercial);

  // Direct route should have higher risk score due to nocturnal lighting hazard
  assert.ok(direct.riskScore > commercial.riskScore);

  // The safer alternative should have an honest tradeoff summary
  assert.ok(commercial.tradeoffSummary.includes("fewer reported issues"));
});
