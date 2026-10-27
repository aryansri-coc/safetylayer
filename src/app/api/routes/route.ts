import { RoutingEngine } from "@/lib/routing/engine";
import { getRoutingProvider } from "@/lib/routing/provider";
import { getStorageRepository } from "@/lib/storage/repository";
import { TravelMode } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      origin = { lat: 28.6335, lng: 77.2205 }, // Connaught Place Outer Circle
      destination = { lat: 28.6248, lng: 77.2245 }, // Tolstoy Marg Junction
      travelMode = "walking" as TravelMode,
      queryHour = new Date().getHours(),
      isDemoMode = false,
    } = body;

    const repo = getStorageRepository();
    const segments = await repo.getRoadSegments();
    const reports = await repo.getHazardReports();

    // Check if request is explicitly for the seeded Central Delhi demo walkthrough corridor:
    // (Origin = Connaught Place Outer Circle, Destination = Tolstoy Marg Junction)
    const isConnaughtPlaceTolstoyDemo =
      Math.abs(origin.lat - 28.6335) < 0.005 &&
      Math.abs(origin.lng - 77.2205) < 0.005 &&
      Math.abs(destination.lat - 28.6248) < 0.005 &&
      Math.abs(destination.lng - 77.2245) < 0.005;

    let candidateRoutes: {
      id: string;
      name: string;
      durationMinutes: number;
      distanceKm: number;
      polyline: [number, number][];
    }[] = [];

    // For seeded Central Delhi demo corridor (when in demo mode or routing the demo corridor)
    if (isDemoMode || isConnaughtPlaceTolstoyDemo) {
      const isWalk = travelMode === "walking" || travelMode === "night_commute";
      const isTwoWheeler = travelMode === "two_wheeler";

      // Sensible average speeds:
      // Walk (~5 km/h): 2.1 km = 25 min, 2.5 km = 30 min, 2.8 km = 34 min
      // Two-wheeler (~21-23 km/h city): 2.1 km = 6 min, 2.5 km = 7 min, 2.8 km = 8 min
      // Vehicle/Driving (~25-28 km/h city): 2.1 km = 5 min, 2.5 km = 6 min, 2.8 km = 7 min
      candidateRoutes = [
        {
          id: "route_direct_service",
          name: "Via Barakhamba Service Lane & KG Underpass",
          durationMinutes: isWalk ? 25 : isTwoWheeler ? 6 : 5,
          distanceKm: 2.1,
          polyline: [
            [origin.lat, origin.lng],
            [28.6315, 77.2235],
            [28.6302, 77.2248],
            [28.6288, 77.2232],
            [28.6265, 77.2242],
            [destination.lat, destination.lng],
          ],
        },
        {
          id: "route_commercial_lit",
          name: "Via Janpath & Tolstoy Marg (Commercial Corridor)",
          durationMinutes: isWalk ? 30 : isTwoWheeler ? 7 : 6,
          distanceKm: 2.5,
          polyline: [
            [origin.lat, origin.lng],
            [28.6328, 77.2185],
            [28.6295, 77.2188],
            [28.6272, 77.2185],
            [28.6248, 77.2182],
            [28.6252, 77.2215],
            [destination.lat, destination.lng],
          ],
        },
        {
          id: "route_outer_radial",
          name: "Via Outer Circle Eastern Radial",
          durationMinutes: isWalk ? 34 : isTwoWheeler ? 8 : 7,
          distanceKm: 2.8,
          polyline: [
            [origin.lat, origin.lng],
            [28.6342, 77.2225],
            [28.6335, 77.2265],
            [28.6295, 77.2272],
            [28.626, 77.2268],
            [destination.lat, destination.lng],
          ],
        },
      ];
    } else {
      // Query active RoutingProvider (OSRM with foot/bike/car profiles or Google Directions)
      const routingProvider = getRoutingProvider();
      const routesFromProvider = await routingProvider.getRoutes(origin, destination, travelMode);

      if (routesFromProvider && routesFromProvider.length > 0) {
        candidateRoutes = routesFromProvider.map((r) => ({
          id: r.id,
          name: r.name,
          durationMinutes: r.durationMinutes,
          distanceKm: r.distanceKm,
          polyline: r.polyline,
        }));
      }
    }

    if (candidateRoutes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No routes found between selected locations. Please check origins and destinations.",
          routes: [],
        },
        { status: 404 }
      );
    }

    const simulatedDate = new Date();
    simulatedDate.setHours(queryHour, 0, 0, 0);

    const reRankedRoutes = RoutingEngine.reRankRoutes(
      candidateRoutes,
      segments,
      reports,
      travelMode,
      simulatedDate
    );

    return NextResponse.json({
      success: true,
      query: {
        origin,
        destination,
        travelMode,
        queryHour,
        timestamp: simulatedDate.toISOString(),
      },
      routes: reRankedRoutes,
      disclaimer: "Information, not a guarantee. SafetyLayer surfaces reported physical road issues.",
    });
  } catch (err: any) {
    console.error("Routing error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
