import { HazardIssue, StreetViewPrior } from "@/types";

export interface GroundTruthHazard {
  id: string;
  segmentId: string;
  issue: HazardIssue;
  trueSeverity: number; // 1-5
  timeProfile: "night_only" | "day_only" | "all_hours";
  activeHours: number[]; // e.g. [20, 21, 22, 23, 0, 1, 2, 3, 4, 5] for night
  appearDay: number; // 0 to N
  fixedDay?: number; // Day on which defect is fixed/repaired
  decayHalfLifeDays: number;
}

export interface WorldNode {
  id: string;
  lat: number;
  lng: number;
}

export interface WorldSegment {
  id: string;
  name: string;
  startNode: string;
  endNode: string;
  coordinates: [number, number][]; // [lat, lng][]
  lengthMeters: number;
  baseSpeedKmH: number;
  isMainRoad: boolean;
  streetviewPrior: StreetViewPrior;
  groundTruthHazards: GroundTruthHazard[];
}

export interface WorldGraph {
  seed: number;
  type: "corridor" | "grid";
  nodes: Map<string, WorldNode>;
  segments: WorldSegment[];
  adjacency: Map<string, { segmentId: string; targetNode: string }[]>;
}

export function toHazardReport(data: {
  id: string;
  userId: string;
  segmentId: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
  issue: HazardIssue;
  timeRelevance: "day" | "night" | "always";
  severity: 1 | 2 | 3 | 4 | 5;
  confidence?: number;
  status?: "published" | "verification_queue" | "rejected";
  presenceVerified?: boolean;
}) {
  return {
    id: data.id,
    segmentId: data.segmentId,
    tier: 1 as const,
    issue: data.issue,
    timeRelevance: data.timeRelevance,
    severity: data.severity,
    confidence: data.confidence ?? 0.85,
    language: "en" as const,
    summary: `Simulated ${data.issue} hazard`,
    coordinates: data.coordinates,
    timestamp: data.timestamp,
    userId: data.userId,
    status: data.status ?? "published",
    verifiedCount: 1,
    contradictedCount: 0,
    presenceVerified: data.presenceVerified ?? true,
    crossModalConsistencyScore: 0.95,
    clientTier: "compressed_upload" as const,
  };
}
