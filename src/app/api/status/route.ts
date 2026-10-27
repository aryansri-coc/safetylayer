import { NextResponse } from "next/server";
import { getGemmaClient } from "@/lib/gemma/client";

export async function GET() {
  const client = getGemmaClient();
  const metadata = client.getMetadata();
  const mapsProvider = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "live_google_maps" : "demo_seeded_maplibre";

  return NextResponse.json({
    gemma: metadata,
    maps: {
      provider: mapsProvider,
      isDemo: !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      corridor: "Central Delhi (Janpath - Connaught Place - Barakhamba)",
    },
    realClipsCount: 0,
    timestamp: new Date().toISOString(),
  });
}
