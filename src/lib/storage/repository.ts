import { HazardReport, RoadSegment, ScoutMission, TrustProfile } from "@/types";
import { SEED_HAZARD_REPORTS, SEED_ROAD_SEGMENTS, SEED_TRUST_PROFILES } from "./seed";
import fs from "fs";
import path from "path";

export interface IStorageRepository {
  getRoadSegments(): Promise<RoadSegment[]>;
  getRoadSegment(id: string): Promise<RoadSegment | null>;
  getHazardReports(segmentId?: string): Promise<HazardReport[]>;
  createHazardReport(report: HazardReport): Promise<HazardReport>;
  updateHazardReport(id: string, updates: Partial<HazardReport>): Promise<HazardReport | null>;
  getTrustProfile(userId: string): Promise<TrustProfile>;
  updateTrustProfile(profile: TrustProfile): Promise<TrustProfile>;
  getScoutMissions(userLat: number, userLng: number): Promise<ScoutMission[]>;
  resetToSeed(): Promise<void>;
}

// In-memory runtime cache with optional JSON persistence for quick local demo
class LocalStorageRepository implements IStorageRepository {
  private segments: RoadSegment[] = [...SEED_ROAD_SEGMENTS];
  private reports: HazardReport[] = [...SEED_HAZARD_REPORTS];
  private profiles: Map<string, TrustProfile> = new Map(
    SEED_TRUST_PROFILES.map((p) => [p.userId, { ...p }])
  );
  private dataFilePath = path.join(process.cwd(), "data", "safelayer_state.json");

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.reports) this.reports = parsed.reports;
        if (parsed.profiles) {
          this.profiles = new Map(parsed.profiles.map((p: TrustProfile) => [p.userId, p]));
        }
      }
    } catch {
      // Fallback silently to seeds
    }
  }

  private saveState() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.dataFilePath,
        JSON.stringify(
          {
            reports: this.reports,
            profiles: Array.from(this.profiles.values()),
          },
          null,
          2
        )
      );
    } catch {
      // Non-critical local persistence failure
    }
  }

  async getRoadSegments(): Promise<RoadSegment[]> {
    return this.segments;
  }

  async getRoadSegment(id: string): Promise<RoadSegment | null> {
    return this.segments.find((s) => s.id === id) || null;
  }

  async getHazardReports(segmentId?: string): Promise<HazardReport[]> {
    if (segmentId) {
      return this.reports.filter((r) => r.segmentId === segmentId);
    }
    return this.reports;
  }

  async createHazardReport(report: HazardReport): Promise<HazardReport> {
    this.reports.unshift(report);
    this.saveState();
    return report;
  }

  async updateHazardReport(id: string, updates: Partial<HazardReport>): Promise<HazardReport | null> {
    const idx = this.reports.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.reports[idx] = { ...this.reports[idx], ...updates };
    this.saveState();
    return this.reports[idx];
  }

  async getTrustProfile(userId: string): Promise<TrustProfile> {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        alpha: 2,
        beta: 2,
        reliabilityScore: 0.5,
        totalReports: 0,
        verifiedReports: 0,
        kmScouted: 0,
        badges: ["New Contributor"],
        lastActive: new Date().toISOString(),
        dailyCreditsEarned: 0,
        lastCreditDate: new Date().toISOString().slice(0, 10),
        pendingUnconfirmedScouts: 0,
        vestedCorroboratedPoints: 0,
      };
      this.profiles.set(userId, profile);
      this.saveState();
    }
    return profile;
  }

  async updateTrustProfile(profile: TrustProfile): Promise<TrustProfile> {
    this.profiles.set(profile.userId, profile);
    this.saveState();
    return profile;
  }

  async getScoutMissions(userLat: number, userLng: number): Promise<ScoutMission[]> {
    // Generate active missions for segments with high uncertainty or ageing reports
    return [
      {
        id: "mission_kg_underpass",
        segmentId: "seg_cp_kg_marg_underpass",
        title: "Verify Footpath & Lighting Status",
        bountyPoints: 50,
        urgency: "high",
        coordinates: { lat: 28.6265, lng: 77.2242 },
      },
      {
        id: "mission_barakhamba",
        segmentId: "seg_cp_barakhamba_back",
        title: "Check Night Lamp Activity (Post-8 PM)",
        bountyPoints: 35,
        urgency: "normal",
        coordinates: { lat: 28.6302, lng: 77.2248 },
      },
    ];
  }

  async resetToSeed(): Promise<void> {
    this.reports = [...SEED_HAZARD_REPORTS];
    this.profiles = new Map(SEED_TRUST_PROFILES.map((p) => [p.userId, { ...p }]));
    this.saveState();
  }
}

// Global singleton repository
let storageRepoInstance: IStorageRepository | null = null;

export function getStorageRepository(): IStorageRepository {
  if (!storageRepoInstance) {
    storageRepoInstance = new LocalStorageRepository();
  }
  return storageRepoInstance;
}
