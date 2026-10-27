import { getStorageRepository } from "@/lib/storage/repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const repo = getStorageRepository();
  const segments = await repo.getRoadSegments();

  const priors = segments.map((s) => ({
    segmentId: s.id,
    name: s.name,
    baselinePrior: s.baselinePrior,
    honestyDeclaration: {
      imageryDate: s.baselinePrior.imageryDate,
      lightingStatus: "Lamps present, working status unknown",
      note: "Street View is daytime imagery and weak prior (weight 0.25). Does not verify nighttime electrical status.",
    },
  }));

  return NextResponse.json({
    success: true,
    count: priors.length,
    priors,
  });
}
