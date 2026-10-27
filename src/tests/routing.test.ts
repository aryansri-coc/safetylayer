import test from "node:test";
import assert from "node:assert";
import { RoutingEngine } from "../lib/routing/engine";
import { SEED_HAZARD_REPORTS, SEED_ROAD_SEGMENTS } from "../lib/storage/seed";
import {
  computeGroupedHazardChips,
  getDistinctRouteHazards,
  selectRecommendedRoute,
} from "../lib/routing/issues";

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

  // The route with fewer reported issues MUST be recommended over the hazardous fastest route
  assert.strictEqual(commercial.isRecommended, true);
  assert.strictEqual(direct.isRecommended, false);

  // Wording checks per A1:
  assert.ok(commercial.tradeoffSummary.includes("Fewer reported issues"));
  assert.ok(direct.tradeoffSummary.includes("Fastest route (14 min), passes"));
});

test("A1: Recommendation selection rule prioritizes fewest issues within acceptable time cost", () => {
  const routes = [
    { id: "fastest_hazardous", durationMinutes: 15, reportedIssuesCount: 4, riskScore: 55 },
    { id: "safer_extra_time", durationMinutes: 18, reportedIssuesCount: 1, riskScore: 20 }, // +3 min is well within acceptable threshold (max(10, 6) = 10 min)
    { id: "slow_alternative", durationMinutes: 30, reportedIssuesCount: 0, riskScore: 10 }, // +15 min exceeds acceptable extra time
  ];

  const res = selectRecommendedRoute(routes);
  assert.strictEqual(res.recommendedId, "safer_extra_time");
  assert.strictEqual(res.tradeoffSummaries["safer_extra_time"], "Fewer reported issues, +3 min.");
  assert.strictEqual(
    res.tradeoffSummaries["fastest_hazardous"],
    "Fastest route (15 min), passes 4 reported issues."
  );
});

test("A1: Fastest route is badged Recommended when it also has the fewest issues", () => {
  const routes = [
    { id: "fastest_and_clean", durationMinutes: 12, reportedIssuesCount: 0, riskScore: 10 },
    { id: "longer_path", durationMinutes: 16, reportedIssuesCount: 2, riskScore: 35 },
  ];

  const res = selectRecommendedRoute(routes);
  assert.strictEqual(res.recommendedId, "fastest_and_clean");
  assert.strictEqual(res.tradeoffSummaries["fastest_and_clean"], "Fastest route, fewest reported issues.");
});

test("A1: Ties in issues count are broken by risk score, then duration", () => {
  const routes = [
    { id: "route_a", durationMinutes: 14, reportedIssuesCount: 2, riskScore: 40 },
    { id: "route_b", durationMinutes: 15, reportedIssuesCount: 2, riskScore: 25 }, // Lower risk score wins tie
  ];

  const res = selectRecommendedRoute(routes);
  assert.strictEqual(res.recommendedId, "route_b");
  assert.strictEqual(res.tradeoffSummaries["route_b"], "Lower risk exposure, +1 min.");
});

test("A1: Zero data routes honestly report 'No reports here yet'", () => {
  const routes = [
    { id: "unmapped_route", durationMinutes: 10, reportedIssuesCount: 0, riskScore: 0, coveragePercentage: 0, dataSource: "no_data_yet" },
  ];

  const res = selectRecommendedRoute(routes);
  assert.strictEqual(res.recommendedId, "unmapped_route");
  assert.strictEqual(res.tradeoffSummaries["unmapped_route"], "No reports here yet. Be the first to report.");
});

test("A6: Single source of truth: distinct route issues, card count, chips count, and map markers align", () => {
  // Test distinct de-duplication: 2 reports on same segment with same issue count as 1 distinct issue
  const testSegments = [
    {
      id: "seg_test_1",
      name: "Test Lane",
      corridor: "test",
      geometry: [[28.63, 77.22], [28.631, 77.221]] as [number, number][],
      lengthMeters: 200,
      baselinePrior: {} as any,
      activeReports: [],
      compositeRisk: { dayRisk: 0.2, nightRisk: 0.5 },
    },
  ];

  const duplicateReports = [
    {
      id: "rep_1",
      segmentId: "seg_test_1",
      issue: "lighting" as const,
      severity: 3 as const,
      status: "published" as const,
      timeRelevance: "night" as const,
      confidence: 0.9,
      language: "en" as const,
      summary: "Lamp 1 dead",
      coordinates: { lat: 28.6305, lng: 77.2205 },
      timestamp: new Date().toISOString(),
      userId: "u1",
      tier: 0 as const,
      verifiedCount: 1,
      contradictedCount: 0,
      presenceVerified: true,
      crossModalConsistencyScore: 0.9,
      clientTier: "tap_only" as const,
    },
    {
      id: "rep_2",
      segmentId: "seg_test_1",
      issue: "lighting" as const, // Duplicate issue on same segment!
      severity: 4 as const,
      status: "published" as const,
      timeRelevance: "night" as const,
      confidence: 0.95,
      language: "en" as const,
      summary: "Lamp 2 also dead",
      coordinates: { lat: 28.6306, lng: 77.2206 },
      timestamp: new Date().toISOString(),
      userId: "u2",
      tier: 0 as const,
      verifiedCount: 1,
      contradictedCount: 0,
      presenceVerified: true,
      crossModalConsistencyScore: 0.9,
      clientTier: "tap_only" as const,
    },
  ];

  const distinctHazards = getDistinctRouteHazards(testSegments, duplicateReports);
  assert.strictEqual(distinctHazards.length, 1, "Duplicate issue on same segment must count as 1 distinct issue");

  const chips = computeGroupedHazardChips(distinctHazards);
  assert.strictEqual(chips.length, 1);
  assert.strictEqual(chips[0].issue, "lighting");
  assert.strictEqual(chips[0].count, 1);
  assert.strictEqual(chips[0].highestSeverity, 3);
});

