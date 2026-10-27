import { ScoutScoringEngine } from "@/lib/scout/scoring";
import { getStorageRepository } from "@/lib/storage/repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const repo = getStorageRepository();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "user_scout_arjun";
  const lat = parseFloat(searchParams.get("lat") || "28.6315");
  const lng = parseFloat(searchParams.get("lng") || "77.2205");

  const profile = await repo.getTrustProfile(userId);
  const missions = await repo.getScoutMissions(lat, lng);

  return NextResponse.json({
    success: true,
    profile,
    activeMissions: missions,
    communityStats: {
      activeScouts: 42,
      kmInspectedThisMonth: 184.2,
      resolvedMunicipalIssues: 16,
    },
    scoringPolicy: {
      dailyCap: 100,
      corroborationRequirement: "Points vest only upon subsequent independent corroboration.",
      unconfirmedWeight: 0,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = "user_scout_arjun",
      segmentId,
      stationaryDurationSeconds = 0,
      verifiedStatus, // e.g. "lamp_dead" | "lamp_working" | "pothole_fixed"
      speedKmh = 0,
      notes,
    } = body;

    // Safety constraint: Never allow scout report if user is in motion!
    if (speedKmh > 1.0 || stationaryDurationSeconds < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Safety Enforcement: Scout reports can only be recorded when safely stationary / parked (speed < 1 km/h for at least 3 seconds).",
        },
        { status: 403 }
      );
    }

    const repo = getStorageRepository();
    const profile = await repo.getTrustProfile(userId);

    // HONESTY ENFORCEMENT: Volume alone earns 0 vested credit.
    // Submission is logged as pending; credit vests upon corroboration.
    const { profile: updatedProfile, vestedPointsAwarded, status } = ScoutScoringEngine.recordSubmission(profile, 0.4);

    await repo.updateTrustProfile(updatedProfile);

    return NextResponse.json({
      success: true,
      message: "Scout verification logged. Credit is pending independent corroboration (anti-spam policy).",
      vestedPointsAwarded,
      status,
      updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
