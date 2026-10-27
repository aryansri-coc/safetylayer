export type HazardType =
  | "lighting"
  | "road_condition"
  | "footpath_missing"
  | "isolated_stretch"
  | "obstruction"
  | "other";

export type HazardIssue = HazardType;

export type TimeRelevance = "day" | "night" | "always";

export type ReportTier = 0 | 1 | 2 | 3;

export type TravelMode = "walking" | "two_wheeler" | "night_commute" | "driving";

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number;
  speedKmh?: number;
  accuracy?: number;
}

export interface HazardReport {
  id: string;
  segmentId: string;
  tier: ReportTier;
  issue: HazardType;
  timeRelevance: TimeRelevance;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0.0 - 1.0
  language: "en" | "hi" | "hinglish";
  summary: string;
  rawClaim?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  userId: string;
  status: "published" | "verification_queue" | "rejected";
  rejectionReason?: string;
  verifiedCount: number;
  contradictedCount: number;
  presenceVerified: boolean;
  crossModalConsistencyScore: number;
  clientTier: "on_device" | "compressed_upload" | "tap_only";
  scoutVerified?: boolean;
}

export interface StreetViewPrior {
  segmentId: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  lampsPresent: boolean;
  lampsWorkingStatus: "unknown" | "verified_working" | "verified_dead";
  roadSurfaceScore: number; // 1 (critical broken) to 5 (pristine)
  footpathPresent: boolean;
  visibilityScore: number; // 1 to 5
  commercialActivity: "high" | "medium" | "low";
  imageryDate: string; // e.g. "2023-11"
  priorHazardScore: number; // 0.0 (safe) to 1.0 (hazardous)
  priorWeight: number; // Default 0.25 (weak prior honesty rule)
  placesSignals: {
    hospitalsNearby: number;
    policeNearby: number;
    openLateStores: number;
  };
}

export interface RoadSegment {
  id: string;
  name: string;
  corridor: string;
  geometry: [number, number][]; // [lat, lng] array
  lengthMeters: number;
  baselinePrior: StreetViewPrior;
  activeReports: HazardReport[];
  compositeRisk: {
    dayRisk: number; // 0.0 to 1.0
    nightRisk: number; // 0.0 to 1.0
    dominantIssue?: HazardType;
  };
}

export interface RouteAlternative {
  id: string;
  name: string;
  isRecommended: boolean;
  durationMinutes: number;
  distanceKm: number;
  polyline: [number, number][]; // [lat, lng] points
  riskScore: number; // 0 (safest) - 100 (high hazard)
  riskCategory: "low_risk" | "moderate_caution" | "elevated_risk";
  hazardsEncountered: HazardReport[];
  priorsEncountered: StreetViewPrior[];
  reasons: string[];
  tradeoffSummary: string; // e.g. "+3 mins, 2 fewer reported issues"
  reportedIssuesCount?: number;
  issueLevel?: "fewer_issues" | "some_issues" | "many_issues" | "no_data";
  dataSource?: "demo_data" | "live_data" | "no_data_yet";
  coveragePercentage?: number;
  coverageNote?: string;
  matchedSegmentIds?: string[];
}

export interface TrustProfile {
  userId: string;
  alpha: number; // Successful corroborated reports (+1 on verification)
  beta: number; // Contradicted reports (+1 on dispute)
  reliabilityScore: number; // alpha / (alpha + beta)
  totalReports: number;
  verifiedReports: number;
  kmScouted: number;
  badges: string[];
  lastActive: string;
  dailyCreditsEarned: number;
  lastCreditDate: string;
  pendingUnconfirmedScouts: number;
  vestedCorroboratedPoints: number;
}

export interface GemmaExtractionResult {
  issue: HazardType;
  time_relevance: TimeRelevance;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  language: "en" | "hi" | "hinglish";
  summary: string;
  raw_claim_transcription?: string;
  detected_elements: string[];
  reasoning_trace?: string;
}

export interface ActiveVerificationPrompt {
  id: string;
  segmentId: string;
  segmentName: string;
  coordinates: { lat: number; lng: number };
  question: string;
  targetHazard: HazardType;
  lastReportedDate: string;
  uncertaintyScore: number;
}

export interface ScoutMission {
  id: string;
  segmentId: string;
  title: string;
  bountyPoints: number;
  urgency: "high" | "normal";
  coordinates: { lat: number; lng: number };
  distanceMetersFromUser?: number;
}
