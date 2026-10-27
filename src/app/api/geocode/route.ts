import { getGeocodingProvider } from "@/lib/geocoding/provider";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : 28.6315;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : 77.2167;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 6;

    if (!query || query.trim().length < 3) {
      return NextResponse.json({
        success: true,
        query,
        results: [],
        message: "Min 3 characters required",
      });
    }

    const provider = getGeocodingProvider();
    const results = await provider.search(query, {
      center: { lat, lng },
      limit,
      countryCode: "in",
    });

    return NextResponse.json({
      success: true,
      query,
      results,
      provider: provider.name,
      attribution:
        provider.name.includes("Google")
          ? "Google Maps Platform"
          : "© OpenStreetMap contributors, Photon by Komoot",
    });
  } catch (err: any) {
    console.error("Geocoding API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to search location", results: [] },
      { status: 500 }
    );
  }
}
