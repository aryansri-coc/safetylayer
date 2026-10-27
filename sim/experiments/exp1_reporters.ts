import { SeededRNG } from "../world/seeded_rng";
import { TrustEngine } from "@/lib/trust/engine";
import { TrustProfile } from "@/types";
import { AgentArchetype } from "../population/types";

export interface ReporterEvolutionPoint {
  reportNumber: number;
  archetype: AgentArchetype;
  reliabilityScore: number;
  alpha: number;
  beta: number;
}

export interface Exp1Result {
  archetypeTrajectories: Record<AgentArchetype, number[]>; // average reliability at report index 1..20
}

export function runExp1ReporterSeparation(seed: number, maxReports = 15): Exp1Result {
  const rng = new SeededRNG(seed + 101);
  const archetypes: AgentArchetype[] = [
    "honest_accurate",
    "honest_noisy",
    "lazy_confirmer",
    "malicious_single",
    "gps_spoofer",
    "colluding_cluster",
    "ai_fake_media",
    "scout_riders",
    "sleeper",
  ];

  const results: Record<AgentArchetype, number[]> = {} as any;

  for (const arch of archetypes) {
    let profile: TrustProfile = {
      userId: `user_${arch}_${seed}`,
      alpha: 2,
      beta: 2,
      reliabilityScore: 0.5,
      totalReports: 0,
      verifiedReports: 0,
      kmScouted: 0,
      badges: [],
      lastActive: new Date().toISOString(),
      dailyCreditsEarned: 0,
      lastCreditDate: "2026-10-26",
      pendingUnconfirmedScouts: 0,
      vestedCorroboratedPoints: 0,
    };

    const trajectory: number[] = [0.5]; // initial Beta(2, 2)

    for (let r = 1; r <= maxReports; r++) {
      let isVerified = false;

      switch (arch) {
        case "honest_accurate":
          isVerified = true;
          break;
        case "honest_noisy":
          // Occasionally slight mismatch
          isVerified = rng.next() > 0.12;
          break;
        case "scout_riders":
          isVerified = true;
          break;
        case "lazy_confirmer":
          // Often uncorroborated
          isVerified = rng.next() > 0.65;
          break;
        case "sleeper":
          // Honest until report 5, then malicious
          isVerified = r <= 5;
          break;
        case "malicious_single":
          // Fails presence check or refuted
          isVerified = false;
          break;
        case "gps_spoofer":
          isVerified = false;
          break;
        case "colluding_cluster":
          // Caught by collusion guard or uncorroborated
          isVerified = rng.next() > 0.85; // rarely slips through if small cluster
          break;
        case "ai_fake_media":
          // High apparent consistency might briefly deceive, but uncorroborated by independent scouts
          isVerified = rng.next() > 0.80;
          break;
      }

      profile = TrustEngine.updateReporterReliability(profile, isVerified);
      trajectory.push(profile.reliabilityScore);
    }

    results[arch] = trajectory;
  }

  return { archetypeTrajectories: results };
}
