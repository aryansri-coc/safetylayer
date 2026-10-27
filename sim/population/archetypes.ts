import { SeededRNG } from "../world/seeded_rng";
import { WorldGraph, WorldSegment } from "../world/types";
import { AgentArchetype, PopulationMixConfig, SimulatedAgent, SimulatedReportPayload } from "./types";
import { GPSPoint, HazardIssue } from "@/types";

export interface PopulationGeneratorConfig {
  totalAgents: number;
  mix: PopulationMixConfig;
  days: number;
  reportsPerAgentPerDay: number;
  locationNoiseMeters?: number;
}

export function createPopulation(
  seed: number,
  config: PopulationGeneratorConfig
): SimulatedAgent[] {
  const rng = new SeededRNG(seed + 100);
  const agents: SimulatedAgent[] = [];

  const types: { type: AgentArchetype; count: number }[] = [
    { type: "honest_accurate", count: Math.round(config.totalAgents * config.mix.honest_accurate) },
    { type: "honest_noisy", count: Math.round(config.totalAgents * config.mix.honest_noisy) },
    { type: "lazy_confirmer", count: Math.round(config.totalAgents * config.mix.lazy_confirmer) },
    { type: "malicious_single", count: Math.round(config.totalAgents * config.mix.malicious_single) },
    { type: "gps_spoofer", count: Math.round(config.totalAgents * config.mix.gps_spoofer) },
    { type: "colluding_cluster", count: Math.round(config.totalAgents * config.mix.colluding_cluster) },
    { type: "ai_fake_media", count: Math.round(config.totalAgents * config.mix.ai_fake_media) },
    { type: "scout_riders", count: Math.round(config.totalAgents * config.mix.scout_riders) },
    { type: "sleeper", count: Math.round(config.totalAgents * config.mix.sleeper) },
  ];

  let idCounter = 1;
  for (const group of types) {
    for (let i = 0; i < group.count; i++) {
      const agentId = `agent_${group.type}_${idCounter++}`;
      let baseSpeed = 25; // km/h
      let locNoise = 3;
      let sevNoise = 0;

      if (group.type === "honest_noisy") {
        locNoise = config.locationNoiseMeters ?? 25;
        sevNoise = 1;
      } else if (group.type === "scout_riders") {
        baseSpeed = 35;
      }

      agents.push({
        id: agentId,
        archetype: group.type,
        baseSpeedKmH: baseSpeed,
        locationNoiseMeters: locNoise,
        severityNoise: sevNoise,
        reportsSubmitted: 0,
        corroboratedReports: 0,
        rejectedReports: 0,
        sleeperTurnDay: group.type === "sleeper" ? 4 : undefined,
        clusterId: group.type === "colluding_cluster" ? `sybil_cluster_${Math.floor(i / 4)}` : undefined,
      });
    }
  }

  return agents;
}

/**
 * Generate synthetic GPS trail along a segment geometry with noise & timing
 */
export function generateGpsTrail(
  segment: WorldSegment,
  startTimeMs: number,
  speedKmH: number,
  noiseMeters: number,
  rng: SeededRNG,
  tampered: "none" | "teleport" | "speeding" | "stationary" | "far_away" = "none"
): GPSPoint[] {
  const coords = segment.coordinates;
  const trail: GPSPoint[] = [];

  if (tampered === "far_away") {
    // Generate trail 400m-800m away
    const offsetLat = 0.005; // ~550m
    const offsetLng = 0.005;
    const durSec = 30;
    for (let i = 0; i < 4; i++) {
      trail.push({
        lat: coords[0][0] + offsetLat + (i * 0.0001),
        lng: coords[0][1] + offsetLng + (i * 0.0001),
        speed: 5.0,
        timestamp: startTimeMs + i * 10000,
        accuracy: 5,
      });
    }
    return trail;
  }

  if (tampered === "stationary") {
    // Zero movement
    for (let i = 0; i < 4; i++) {
      trail.push({
        lat: coords[0][0],
        lng: coords[0][1],
        speed: 0.1,
        timestamp: startTimeMs + i * 5000,
        accuracy: 3,
      });
    }
    return trail;
  }

  if (tampered === "teleport" || tampered === "speeding") {
    // Impossible speed (e.g. 180 km/h)
    trail.push({
      lat: coords[0][0],
      lng: coords[0][1],
      speed: 150,
      timestamp: startTimeMs,
      accuracy: 5,
    });
    trail.push({
      lat: coords[coords.length - 1][0],
      lng: coords[coords.length - 1][1],
      speed: 180,
      timestamp: startTimeMs + 1000, // 1 sec for entire segment!
      accuracy: 5,
    });
    return trail;
  }

  // Realistic normal traversal
  const speedMps = Math.max(1.0, (speedKmH * 1000) / 3600);
  const totalDist = segment.lengthMeters;
  const durationSec = Math.max(10, Math.round(totalDist / speedMps));
  const pointsCount = Math.max(4, Math.min(10, Math.round(durationSec / 5)));

  for (let i = 0; i < pointsCount; i++) {
    const fraction = i / (pointsCount - 1);
    // Interpolate along coords
    const cIdx = Math.min(coords.length - 1, Math.floor(fraction * (coords.length - 1)));
    const basePt = coords[cIdx];

    // Add noise meters
    const latNoise = (rng.nextGaussian() * noiseMeters) / 111320;
    const lngNoise = (rng.nextGaussian() * noiseMeters) / (111320 * Math.cos((basePt[0] * Math.PI) / 180));

    trail.push({
      lat: basePt[0] + latNoise,
      lng: basePt[1] + lngNoise,
      speed: speedMps + rng.nextGaussian(0, 0.5),
      timestamp: startTimeMs + Math.round((i * durationSec * 1000) / pointsCount),
      accuracy: Math.max(3, Math.round(noiseMeters + rng.next() * 4)),
    });
  }

  return trail;
}

/**
 * Generate simulated reports for a population across time on the world graph
 */
export function generateReportsForDay(
  agents: SimulatedAgent[],
  world: WorldGraph,
  dayIndex: number,
  seed: number
): SimulatedReportPayload[] {
  const rng = new SeededRNG(seed + dayIndex * 997);
  const reports: SimulatedReportPayload[] = [];
  const baseTimestamp = new Date("2026-10-15T00:00:00Z").getTime() + dayIndex * 86400000;

  for (const agent of agents) {
    // Determine whether agent generates reports today (sparsity check)
    // Scouts report daily, colluders burst, regular agents have 40% daily chance
    let reportCount = 0;
    if (agent.archetype === "scout_riders") {
      reportCount = rng.nextInt(2, 4);
    } else if (agent.archetype === "colluding_cluster") {
      reportCount = dayIndex === 3 || dayIndex === 7 ? 2 : 0; // Collusion attacks on days 3 and 7
    } else if (agent.archetype === "sleeper") {
      reportCount = rng.nextInt(1, 2);
    } else {
      if (rng.next() < 0.45) {
        reportCount = rng.nextInt(1, 2);
      }
    }

    for (let r = 0; r < reportCount; r++) {
      // Pick hour of day
      let hour = rng.nextInt(7, 23);
      if (agent.archetype === "scout_riders") {
        hour = rng.nextInt(18, 23); // Night scouts
      }

      const timestampMs = baseTimestamp + hour * 3600000 + rng.nextInt(0, 3500000);
      const isoTimestamp = new Date(timestampMs).toISOString();

      // Pick segment (scout riders stick to main roads)
      const availableSegments = agent.archetype === "scout_riders"
        ? world.segments.filter((s) => s.isMainRoad)
        : world.segments;
      const targetSegment = rng.choice(availableSegments);

      // Check ground-truth state on targetSegment
      const activeGt = targetSegment.groundTruthHazards.find((h) => {
        if (dayIndex < h.appearDay) return false;
        if (h.fixedDay !== undefined && dayIndex >= h.fixedDay) return false;
        if (h.timeProfile === "night_only" && (hour < 19 && hour >= 6)) return false;
        return true;
      });

      // Handle Archetype-specific behavior
      let isTruthful = false;
      let reportedIssue: HazardIssue = "lighting";
      let severity: 1 | 2 | 3 | 4 | 5 = 3;
      let tamperMode: "none" | "teleport" | "speeding" | "stationary" | "far_away" = "none";
      let mediaConsistency = 0.95;

      switch (agent.archetype) {
        case "honest_accurate": {
          if (activeGt) {
            isTruthful = true;
            reportedIssue = activeGt.issue;
            severity = activeGt.trueSeverity as 1 | 2 | 3 | 4 | 5;
          } else {
            // Nothing to report honestly
            continue;
          }
          break;
        }

        case "honest_noisy": {
          if (activeGt) {
            isTruthful = true;
            reportedIssue = activeGt.issue;
            // Severity noise +/- 1
            severity = Math.max(1, Math.min(5, activeGt.trueSeverity + rng.nextInt(-1, 1))) as 1 | 2 | 3 | 4 | 5;
          } else {
            continue;
          }
          break;
        }

        case "lazy_confirmer": {
          // Reports low severity "road_condition" with severity 1
          isTruthful = activeGt ? activeGt.trueSeverity <= 1 : true;
          reportedIssue = "road_condition";
          severity = 1;
          break;
        }

        case "malicious_single": {
          // Submits false hazard on a segment they never visited!
          isTruthful = false;
          reportedIssue = "isolated_stretch";
          severity = 4;
          tamperMode = "far_away";
          mediaConsistency = 0.4;
          break;
        }

        case "gps_spoofer": {
          // Fabricates trail with teleport / extreme speed
          isTruthful = false;
          reportedIssue = "road_condition";
          severity = 5;
          tamperMode = "speeding";
          mediaConsistency = 0.5;
          break;
        }

        case "colluding_cluster": {
          // Multiple accounts report same fake hazard on targetSegment
          isTruthful = false;
          reportedIssue = "lighting";
          severity = 4;
          mediaConsistency = 0.85;
          break;
        }

        case "ai_fake_media": {
          // Media looks authentic, high consistency, but false claim
          isTruthful = false;
          reportedIssue = "obstruction";
          severity = 5;
          mediaConsistency = 0.96; // AI-generated convincing evidence
          break;
        }

        case "scout_riders": {
          if (activeGt) {
            isTruthful = true;
            reportedIssue = activeGt.issue;
            severity = activeGt.trueSeverity as 1 | 2 | 3 | 4 | 5;
          } else {
            // Confirms clear road
            continue;
          }
          break;
        }

        case "sleeper": {
          const isTurned = dayIndex >= (agent.sleeperTurnDay ?? 4);
          if (!isTurned) {
            // Honest phase
            if (activeGt) {
              isTruthful = true;
              reportedIssue = activeGt.issue;
              severity = activeGt.trueSeverity as 1 | 2 | 3 | 4 | 5;
            } else {
              continue;
            }
          } else {
            // Malicious phase: submit false severe hazard with authentic GPS trail
            isTruthful = false;
            reportedIssue = "lighting";
            severity = 5;
            mediaConsistency = 0.9;
          }
          break;
        }
      }

      // Generate Trail
      const trail = generateGpsTrail(
        targetSegment,
        timestampMs,
        agent.baseSpeedKmH,
        agent.locationNoiseMeters,
        rng,
        tamperMode
      );

      // Target coordinate on segment
      const midCoord = targetSegment.coordinates[Math.floor(targetSegment.coordinates.length / 2)];
      const latNoise = (rng.nextGaussian() * agent.locationNoiseMeters) / 111320;
      const lngNoise = (rng.nextGaussian() * agent.locationNoiseMeters) / (111320 * Math.cos((midCoord[0] * Math.PI) / 180));

      reports.push({
        reportId: `sim_rep_${dayIndex}_${agent.id}_${r}`,
        userId: agent.id,
        userArchetype: agent.archetype,
        segmentId: targetSegment.id,
        coordinates: { lat: midCoord[0] + latNoise, lng: midCoord[1] + lngNoise },
        timestamp: isoTimestamp,
        dayIndex,
        hourOfDay: hour,
        issue: reportedIssue,
        severity,
        gpsTrail: trail,
        mediaConsistencyScore: mediaConsistency,
        isTruthful,
        groundTruthSeverity: activeGt?.trueSeverity,
        apparentSpeedKmH: agent.baseSpeedKmH,
        stationaryDurationSeconds: agent.archetype === "scout_riders" ? 4 : undefined,
        clusterId: agent.clusterId,
      });

      agent.reportsSubmitted++;
    }
  }

  return reports;
}
