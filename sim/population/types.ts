import { GPSPoint, HazardIssue } from "@/types";

export type AgentArchetype =
  | "honest_accurate"
  | "honest_noisy"
  | "lazy_confirmer"
  | "malicious_single"
  | "gps_spoofer"
  | "colluding_cluster"
  | "ai_fake_media"
  | "scout_riders"
  | "sleeper";

export interface SimulatedAgent {
  id: string;
  archetype: AgentArchetype;
  baseSpeedKmH: number;
  locationNoiseMeters: number;
  severityNoise: number;
  reportsSubmitted: number;
  corroboratedReports: number;
  rejectedReports: number;
  sleeperTurnDay?: number; // for sleeper agent
  clusterId?: string; // for colluding cluster
}

export interface SimulatedReportPayload {
  reportId: string;
  userId: string;
  userArchetype: AgentArchetype;
  segmentId: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
  dayIndex: number;
  hourOfDay: number;
  issue: HazardIssue;
  severity: 1 | 2 | 3 | 4 | 5;
  gpsTrail: GPSPoint[];
  mediaConsistencyScore: number;
  isTruthful: boolean;
  groundTruthSeverity?: number;
  apparentSpeedKmH: number;
  stationaryDurationSeconds?: number;
  clusterId?: string;
}

export interface PopulationMixConfig {
  honest_accurate: number; // e.g. 0.40
  honest_noisy: number;    // e.g. 0.20
  lazy_confirmer: number;  // e.g. 0.10
  malicious_single: number;// e.g. 0.05
  gps_spoofer: number;     // e.g. 0.05
  colluding_cluster: number; // e.g. 0.05
  ai_fake_media: number;   // e.g. 0.05
  scout_riders: number;    // e.g. 0.05
  sleeper: number;         // e.g. 0.05
}
