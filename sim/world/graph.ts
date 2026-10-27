import { SeededRNG } from "./seeded_rng";
import { GroundTruthHazard, WorldGraph, WorldNode, WorldSegment } from "./types";
import { SEED_ROAD_SEGMENTS } from "@/lib/storage/seed";
import { HazardIssue, StreetViewPrior } from "@/types";

export interface GraphGenerationConfig {
  type: "corridor" | "grid";
  gridRows?: number;
  gridCols?: number;
  hazardDensity?: number; // 0.0 to 1.0 probability of a segment having a ground truth hazard
  fixedHazardRatio?: number; // fraction of hazards that get repaired mid-sim
  dynamicAppearRatio?: number; // fraction of hazards that appear mid-sim
}

export function createWorldGraph(seed: number, config: GraphGenerationConfig): WorldGraph {
  const rng = new SeededRNG(seed);
  const nodes = new Map<string, WorldNode>();
  const segments: WorldSegment[] = [];
  const adjacency = new Map<string, { segmentId: string; targetNode: string }[]>();

  const addEdge = (from: string, to: string, segId: string) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ segmentId: segId, targetNode: to });
  };

  if (config.type === "corridor") {
    // Build from existing Central Delhi corridor
    SEED_ROAD_SEGMENTS.forEach((seedSeg, idx) => {
      const startId = `node_corr_${idx * 2}`;
      const endId = `node_corr_${idx * 2 + 1}`;

      const coords = seedSeg.geometry as [number, number][];
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      if (!nodes.has(startId)) {
        nodes.set(startId, { id: startId, lat: startCoord[0], lng: startCoord[1] });
      }
      if (!nodes.has(endId)) {
        nodes.set(endId, { id: endId, lat: endCoord[0], lng: endCoord[1] });
      }

      const isMain = seedSeg.name.toLowerCase().includes("main") || seedSeg.name.toLowerCase().includes("outer");

      const seg: WorldSegment = {
        id: seedSeg.id,
        name: seedSeg.name,
        startNode: startId,
        endNode: endId,
        coordinates: coords,
        lengthMeters: seedSeg.lengthMeters,
        baseSpeedKmH: isMain ? 40 : 25,
        isMainRoad: isMain,
        streetviewPrior: seedSeg.baselinePrior,
        groundTruthHazards: [],
      };

      segments.push(seg);
      addEdge(startId, endId, seg.id);
      addEdge(endId, startId, seg.id);
    });

    // Add connecting edges so corridor is navigable
    const baseSegmentsCount = segments.length;
    for (let i = 0; i < baseSegmentsCount - 1; i++) {
      const fromNode = segments[i].endNode;
      const toNode = segments[i + 1].startNode;
      const connId = `conn_${i}_${i + 1}`;
      const c1 = nodes.get(fromNode)!;
      const c2 = nodes.get(toNode)!;
      const seg: WorldSegment = {
        id: connId,
        name: `Interconnection ${i}-${i + 1}`,
        startNode: fromNode,
        endNode: toNode,
        coordinates: [[c1.lat, c1.lng], [c2.lat, c2.lng]],
        lengthMeters: 150,
        baseSpeedKmH: 30,
        isMainRoad: true,
        streetviewPrior: {
          segmentId: connId,
          coordinates: { lat: (c1.lat + c2.lat) / 2, lng: (c1.lng + c2.lng) / 2 },
          lampsPresent: true,
          lampsWorkingStatus: "verified_working",
          roadSurfaceScore: 4,
          footpathPresent: true,
          visibilityScore: 4,
          commercialActivity: "high",
          imageryDate: "2024-01",
          priorHazardScore: 0.2,
          priorWeight: 0.25,
          placesSignals: { hospitalsNearby: 1, policeNearby: 1, openLateStores: 4 },
        },
        groundTruthHazards: [],
      };
      segments.push(seg);
      addEdge(fromNode, toNode, seg.id);
      addEdge(toNode, fromNode, seg.id);
    }
  } else {
    // Procedural Grid Generation (NxM)
    const rows = config.gridRows || 5;
    const cols = config.gridCols || 5;
    const baseLat = 28.6300;
    const baseLng = 77.2200;
    const latStep = 0.0035; // ~380m
    const lngStep = 0.0040; // ~390m

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nodeId = `grid_${r}_${c}`;
        nodes.set(nodeId, {
          id: nodeId,
          lat: baseLat + r * latStep,
          lng: baseLng + c * lngStep,
        });
      }
    }

    // Horizontal and vertical edges
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = `grid_${r}_${c}`;
        const uNode = nodes.get(u)!;

        // East edge
        if (c + 1 < cols) {
          const v = `grid_${r}_${c + 1}`;
          const vNode = nodes.get(v)!;
          const segId = `seg_h_${r}_${c}`;
          const isMain = r === 0 || r === rows - 1 || r === Math.floor(rows / 2);
          const seg: WorldSegment = {
            id: segId,
            name: `${isMain ? "Avenue" : "Street"} East-West ${r}-${c}`,
            startNode: u,
            endNode: v,
            coordinates: [[uNode.lat, uNode.lng], [vNode.lat, vNode.lng]],
            lengthMeters: 390,
            baseSpeedKmH: isMain ? 45 : 25,
            isMainRoad: isMain,
            streetviewPrior: generateSyntheticPrior(segId, (uNode.lat + vNode.lat) / 2, (uNode.lng + vNode.lng) / 2, isMain, rng),
            groundTruthHazards: [],
          };
          segments.push(seg);
          addEdge(u, v, segId);
          addEdge(v, u, segId);
        }

        // South edge
        if (r + 1 < rows) {
          const v = `grid_${r + 1}_${c}`;
          const vNode = nodes.get(v)!;
          const segId = `seg_v_${r}_${c}`;
          const isMain = c === 0 || c === cols - 1 || c === Math.floor(cols / 2);
          const seg: WorldSegment = {
            id: segId,
            name: `${isMain ? "Boulevard" : "Lane"} North-South ${r}-${c}`,
            startNode: u,
            endNode: v,
            coordinates: [[uNode.lat, uNode.lng], [vNode.lat, vNode.lng]],
            lengthMeters: 380,
            baseSpeedKmH: isMain ? 40 : 20,
            isMainRoad: isMain,
            streetviewPrior: generateSyntheticPrior(segId, (uNode.lat + vNode.lat) / 2, (uNode.lng + vNode.lng) / 2, isMain, rng),
            groundTruthHazards: [],
          };
          segments.push(seg);
          addEdge(u, v, segId);
          addEdge(v, u, segId);
        }
      }
    }
  }

  // Populate Hidden Ground-Truth State per Segment
  const density = config.hazardDensity ?? 0.35;
  const fixedRatio = config.fixedHazardRatio ?? 0.25;
  const dynamicAppearRatio = config.dynamicAppearRatio ?? 0.20;
  const issues: HazardIssue[] = ["lighting", "road_condition", "footpath_missing", "isolated_stretch", "obstruction"];

  segments.forEach((seg, sIdx) => {
    // Determine whether this segment has a ground truth hazard
    if (rng.next() < density) {
      const issue = rng.choice(issues);
      const trueSeverity = rng.nextInt(2, 5);

      let timeProfile: "night_only" | "day_only" | "all_hours" = "all_hours";
      let activeHours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

      if (issue === "lighting") {
        timeProfile = "night_only";
        activeHours = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
      } else if (issue === "isolated_stretch") {
        timeProfile = "night_only";
        activeHours = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
      }

      // Non-stationary handling
      let appearDay = 0;
      let fixedDay: number | undefined = undefined;

      if (rng.next() < dynamicAppearRatio) {
        appearDay = rng.nextInt(2, 6); // appears on day 2-6
      }

      if (rng.next() < fixedRatio) {
        fixedDay = appearDay + rng.nextInt(3, 7); // repaired 3-7 days later
      }

      const hazard: GroundTruthHazard = {
        id: `gt_haz_${seed}_${sIdx}`,
        segmentId: seg.id,
        issue,
        trueSeverity,
        timeProfile,
        activeHours,
        appearDay,
        fixedDay,
        decayHalfLifeDays: issue === "obstruction" ? 3 : issue === "road_condition" ? 21 : 14,
      };

      seg.groundTruthHazards.push(hazard);
    }
  });

  return {
    seed,
    type: config.type,
    nodes,
    segments,
    adjacency,
  };
}

function generateSyntheticPrior(
  segmentId: string,
  lat: number,
  lng: number,
  isMain: boolean,
  rng: SeededRNG
): StreetViewPrior {
  const surfaceScore = isMain ? rng.nextInt(4, 5) : rng.nextInt(2, 4);
  const footpath = isMain ? true : rng.next() > 0.4;
  const lamps = isMain ? true : rng.next() > 0.25;
  const commercial = isMain ? (rng.next() > 0.3 ? "high" : "medium") : (rng.next() > 0.6 ? "medium" : "low");

  const priorScore = (!lamps ? 0.35 : 0.05) + (5 - surfaceScore) * 0.08 + (!footpath ? 0.2 : 0.0);

  return {
    segmentId,
    coordinates: { lat, lng },
    lampsPresent: lamps,
    lampsWorkingStatus: lamps ? "verified_working" : "unknown",
    roadSurfaceScore: surfaceScore,
    footpathPresent: footpath,
    visibilityScore: isMain ? 4 : 2,
    commercialActivity: commercial as "low" | "medium" | "high",
    imageryDate: "2023-11",
    priorHazardScore: Math.min(1.0, Math.max(0.05, priorScore)),
    priorWeight: 0.25,
    placesSignals: {
      hospitalsNearby: isMain ? rng.nextInt(0, 2) : 0,
      policeNearby: isMain && rng.next() > 0.6 ? 1 : 0,
      openLateStores: isMain ? rng.nextInt(3, 8) : rng.nextInt(0, 2),
    },
  };
}
