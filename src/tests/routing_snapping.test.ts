import test from "node:test";
import assert from "node:assert";
import { snapPolylineToSegments } from "../lib/routing/snapping";
import { RoutingEngine } from "../lib/routing/engine";
import { SEED_ROAD_SEGMENTS, SEED_HAZARD_REPORTS } from "../lib/storage/seed";

test("snapPolylineToSegments: snaps polyline points within threshold to known segments", () => {
  // Polyline overlapping Connaught Place outer circle
  const cpPolyline: [number, number][] = [
    [28.6335, 77.2205],
    [28.6328, 77.2185],
    [28.6342, 77.2225],
  ];

  const snapping = snapPolylineToSegments(cpPolyline, SEED_ROAD_SEGMENTS, 80);
  assert.ok(snapping.hasKnownCoverage);
  assert.ok(snapping.matchedSegments.length > 0);
  assert.strictEqual(snapping.isDemoCorridor, true);
  assert.ok(snapping.coveragePercentage > 50);
});

test("snapPolylineToSegments: honestly flags unmapped roads with 'No data yet' and 0% coverage", () => {
  // Remote polyline in Bangalore/Mumbai far from seeded Delhi segments
  const remotePolyline: [number, number][] = [
    [12.9716, 77.5946],
    [12.972, 77.595],
    [12.973, 77.596],
  ];

  const snapping = snapPolylineToSegments(remotePolyline, SEED_ROAD_SEGMENTS, 75);
  assert.strictEqual(snapping.hasKnownCoverage, false);
  assert.strictEqual(snapping.matchedSegments.length, 0);
  assert.strictEqual(snapping.coveragePercentage, 0);
  assert.strictEqual(snapping.unmatchedSegmentsNote, "No reports here yet. Be the first to report.");
});

test("RoutingEngine: unmapped routes receive 0 risk score and 'No data yet' status (never invent risk)", () => {
  const unmappedCandidates = [
    {
      id: "unmapped_route_1",
      name: "Remote Highway",
      durationMinutes: 25,
      distanceKm: 18.2,
      polyline: [
        [19.076, 72.8777],
        [19.08, 72.88],
      ] as [number, number][],
    },
  ];

  const scored = RoutingEngine.reRankRoutes(
    unmappedCandidates,
    SEED_ROAD_SEGMENTS,
    SEED_HAZARD_REPORTS,
    "walking",
    new Date()
  );

  assert.strictEqual(scored.length, 1);
  const route = scored[0];
  assert.strictEqual(route.riskScore, 0);
  assert.strictEqual(route.reportedIssuesCount, 0);
  assert.strictEqual(route.issueLevel, "no_data");
  assert.strictEqual(route.dataSource, "no_data_yet");
  assert.strictEqual(route.coveragePercentage, 0);
  assert.strictEqual(route.tradeoffSummary, "No reports here yet. Be the first to report.");
});
