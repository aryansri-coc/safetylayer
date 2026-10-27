"use client";

import React, { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import SafetyLayerMap from "@/components/SafetyLayerMap";
import RouteDrawer from "@/components/RouteDrawer";
import ReportModal from "@/components/ReportModal";
import ScoutPanel from "@/components/ScoutPanel";
import CivicComplaintModal from "@/components/CivicComplaintModal";
import PrivacyModal from "@/components/PrivacyModal";
import DemoWalkthrough from "@/components/DemoWalkthrough";
import LocationSearchBar, { SelectedLocation } from "@/components/LocationSearchBar";
import LocationPromptModal from "@/components/LocationPromptModal";
import WelcomeCard from "@/components/WelcomeCard";
import HazardDetailSheet from "@/components/HazardDetailSheet";
import DeveloperInfoModal from "@/components/DeveloperInfoModal";
import { evaluateScoutPrompt, ScoutPromptCandidate } from "@/lib/scout/prompts";
import {
  GeolocationState,
  getGeolocationManager,
  INITIAL_GEOLOCATION_STATE,
} from "@/lib/location/geolocation";
import {
  HazardReport,
  RoadSegment,
  RouteAlternative,
  ScoutMission,
  TravelMode,
  TrustProfile,
} from "@/types";
import { AlertTriangle, MapPin, Navigation, Plus, Sparkles, X } from "lucide-react";

export default function HomePage() {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteAlternative | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [inspectedHazard, setInspectedHazard] = useState<HazardReport | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("walking");
  const [queryHour, setQueryHour] = useState<number>(new Date().getHours());
  const [scoutProfile, setScoutProfile] = useState<TrustProfile | undefined>(undefined);
  const [scoutMissions, setScoutMissions] = useState<ScoutMission[]>([]);

  // Navigation Origin & Destination State
  const [origin, setOrigin] = useState<SelectedLocation>({
    name: "Your location",
    fullAddress: "Current position",
    lat: 28.6335,
    lng: 77.2205,
    isCurrentLocation: true,
  });

  const [destination, setDestination] = useState<SelectedLocation | null>({
    name: "Tolstoy Marg Junction",
    fullAddress: "Tolstoy Marg, Connaught Place, New Delhi",
    lat: 28.6248,
    lng: 77.2245,
  });

  // Geolocation State
  const [geoState, setGeoState] = useState<GeolocationState>(INITIAL_GEOLOCATION_STATE);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);

  // Modals & Panels
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isScoutOpen, setIsScoutOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isCivicOpen, setIsCivicOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isDevInfoOpen, setIsDevInfoOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // Scout verification prompt (A5: proximity, stationary check, neutral wording)
  const [activeScoutPrompt, setActiveScoutPrompt] = useState<ScoutPromptCandidate | null>(null);
  const [isScoutPromptDismissedSession, setIsScoutPromptDismissedSession] = useState(false);

  // Subscribe to Geolocation Manager
  useEffect(() => {
    const geoManager = getGeolocationManager();
    const unsubscribe = geoManager.subscribe((state) => {
      setGeoState(state);
      setIsLocating(state.status === "prompting");

      // Update origin if it's set to "Your location"
      if (state.coords && state.status === "granted") {
        setOrigin((prev) => {
          if (prev.isCurrentLocation) {
            return {
              ...prev,
              lat: state.coords!.lat,
              lng: state.coords!.lng,
            };
          }
          return prev;
        });
      }
    });

    // Check first-run welcome card
    try {
      const dismissed = localStorage.getItem("safetylayer_welcome_dismissed");
      if (!dismissed) {
        setIsWelcomeOpen(true);
      }
    } catch {
      // Fallback
    }

    // Check session scout dismissal
    try {
      if (sessionStorage.getItem("safetylayer_scout_dismissed")) {
        setIsScoutPromptDismissedSession(true);
      }
    } catch {
      // Fallback
    }

    return () => unsubscribe();
  }, []);

  // Evaluate scout verification prompt when GPS or demo conditions change
  useEffect(() => {
    if (isWelcomeOpen || isScoutPromptDismissedSession) {
      setActiveScoutPrompt(null);
      return;
    }

    const prompt = evaluateScoutPrompt(reports, segments, {
      userCoords: geoState.coords,
      speedKmh: geoState.coords ? 0 : undefined,
      stationarySeconds: geoState.coords ? 6 : 0,
      isScoutModeOptedIn: isScoutOpen,
      isDemoRunning: isDemoOpen,
      isWelcomeOpen: isWelcomeOpen,
      isDismissedThisSession: isScoutPromptDismissedSession,
      currentHour: queryHour,
    });

    setActiveScoutPrompt(prompt);
  }, [
    reports,
    segments,
    geoState.coords,
    isScoutOpen,
    isDemoOpen,
    isWelcomeOpen,
    isScoutPromptDismissedSession,
    queryHour,
  ]);


  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Re-fetch routes when origin, destination, travelMode, or queryHour changes
  useEffect(() => {
    if (destination) {
      fetchRoutes(origin, destination, travelMode, queryHour);
    }
  }, [origin.lat, origin.lng, destination?.lat, destination?.lng, travelMode, queryHour]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch reports
      const repRes = await fetch("/api/reports");
      const repData = await repRes.json();
      if (repData.success) {
        setReports(repData.reports);
      }

      // 2. Fetch baseline segments
      const baseRes = await fetch("/api/baseline");
      const baseData = await baseRes.json();
      if (baseData.success && baseData.priors) {
        const segs: RoadSegment[] = baseData.priors.map((p: any) => ({
          id: p.segmentId,
          name: p.name,
          corridor: "delhi_cp",
          geometry: [
            [p.baselinePrior.coordinates.lat - 0.001, p.baselinePrior.coordinates.lng - 0.001],
            [p.baselinePrior.coordinates.lat, p.baselinePrior.coordinates.lng],
            [p.baselinePrior.coordinates.lat + 0.001, p.baselinePrior.coordinates.lng + 0.001],
          ],
          lengthMeters: 450,
          baselinePrior: p.baselinePrior,
          activeReports: [],
          compositeRisk: {
            dayRisk: p.baselinePrior.priorHazardScore,
            nightRisk: p.baselinePrior.priorHazardScore > 0.5 ? 0.85 : 0.3,
            dominantIssue: p.baselinePrior.lampsPresent ? undefined : "lighting",
          },
        }));
        setSegments(segs);
      }

      // 3. Fetch scout missions
      const scoutRes = await fetch("/api/scout?userId=user_scout_arjun");
      const scoutData = await scoutRes.json();
      if (scoutData.success) {
        setScoutProfile(scoutData.profile);
        setScoutMissions(scoutData.activeMissions);
      }

      // 4. Initial routes
      if (destination) {
        fetchRoutes(origin, destination, travelMode, queryHour);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  };

  const fetchRoutes = async (
    orig: SelectedLocation,
    dest: SelectedLocation,
    mode: TravelMode,
    hour: number
  ) => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: orig.lat, lng: orig.lng },
          destination: { lat: dest.lat, lng: dest.lng },
          travelMode: mode,
          queryHour: hour,
        }),
      });
      const data = await res.json();
      if (data.success && data.routes) {
        setRoutes(data.routes);
        const rec = data.routes.find((r: RouteAlternative) => r.isRecommended) || data.routes[0];
        setSelectedRoute(rec);
      }
    } catch (err) {
      console.error("Routes error:", err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handleSwapLocations = () => {
    if (!destination) return;
    const oldOrigin = { ...origin };
    const oldDest = { ...destination };

    setOrigin({
      name: oldDest.name,
      fullAddress: oldDest.fullAddress,
      lat: oldDest.lat,
      lng: oldDest.lng,
      isCurrentLocation: false,
    });

    setDestination({
      name: oldOrigin.name,
      fullAddress: oldOrigin.fullAddress,
      lat: oldOrigin.lat,
      lng: oldOrigin.lng,
    });
  };

  const handleTriggerLocateMe = async () => {
    // If permission has never been requested or was dismissed, show friendly explanation
    if (geoState.status === "idle" || geoState.status === "denied" || geoState.status === "insecure_context") {
      setIsLocationPromptOpen(true);
    } else {
      const geoManager = getGeolocationManager();
      await geoManager.requestLocation();
    }
  };

  const handleAllowLocationFromPrompt = async () => {
    setIsLocationPromptOpen(false);
    const geoManager = getGeolocationManager();
    await geoManager.requestLocation();
  };

  const handleReportSubmitted = (result: any) => {
    if (result.report && result.report.status === "published") {
      setReports((prev) => [result.report, ...prev]);
      if (destination) {
        fetchRoutes(origin, destination, travelMode, queryHour);
      }
    }
  };

  const handleMissionClaimed = (missionId: string) => {
    setScoutMissions((prev) => prev.filter((m) => m.id !== missionId));
    setActiveScoutPrompt(null);
  };

  const handleDismissWelcome = () => {
    setIsWelcomeOpen(false);
    try {
      localStorage.setItem("safetylayer_welcome_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  const handleStartDemo = () => {
    setIsWelcomeOpen(false);
    setIsDemoOpen(true);
    // Reset to demo Connaught Place coordinates
    setOrigin({
      name: "Connaught Place Outer Circle",
      fullAddress: "Outer Circle, CP, New Delhi",
      lat: 28.6335,
      lng: 77.2205,
      isCurrentLocation: false,
    });
    setDestination({
      name: "Tolstoy Marg Junction",
      fullAddress: "Tolstoy Marg, CP, New Delhi",
      lat: 28.6248,
      lng: 77.2245,
    });
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setDestination({
      name: `Map point (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`,
      fullAddress: `Selected map coordinate (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950 font-sans text-titanium-200">
      {/* Clean Navbar */}
      <Navbar
        onOpenReport={() => setIsReportOpen(true)}
        onOpenScout={() => setIsScoutOpen(true)}
        onOpenDemo={handleStartDemo}
        onOpenCivic={() => setIsCivicOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenDevInfo={() => setIsDevInfoOpen(true)}
        isDemoActive={isDemoOpen}
      />

      {/* Main Body Area: Mobile-First Layout */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Full-bleed Map View */}
        <div className="flex-1 relative h-full w-full">
          {/* Prominent Search Bar (Top Center/Left) */}
          <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 lg:w-[440px] z-30">
            <LocationSearchBar
              origin={origin}
              destination={destination}
              onSelectOrigin={(loc) => setOrigin(loc)}
              onSelectDestination={(loc) => setDestination(loc)}
              onSwapLocations={handleSwapLocations}
              onGetRoutes={() => {
                if (destination) {
                  fetchRoutes(origin, destination, travelMode, queryHour);
                }
              }}
              mapCenter={{ lat: origin.lat, lng: origin.lng }}
              onClearDestination={() => setDestination(null)}
            />
          </div>

          {/* Low GPS Accuracy Alert Toast */}
          {geoState.isPoorAccuracy && !isWelcomeOpen && (
            <div className="absolute top-36 left-4 right-4 md:left-6 md:right-auto md:w-96 z-20 bg-obsidian-950/95 p-2.5 rounded-xl border border-cyber-amber/40 text-xs flex items-center justify-between text-titanium-200 animate-fade-in shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyber-amber shrink-0" />
                <span>
                  Low GPS accuracy (~{geoState.accuracy}m). Drag pin or search manually.
                </span>
              </div>
            </div>
          )}

          {/* Active Scout Verification Toast (A5: Neutral wording, stationary lock, no volume pts) */}
          {activeScoutPrompt && !isWelcomeOpen && (
            <div className="absolute top-36 left-4 right-4 md:left-6 md:right-auto md:w-[440px] z-20 bg-obsidian-950/95 p-3 rounded-xl border border-white/20 shadow-2xl animate-fade-in flex items-center justify-between gap-3 text-xs text-titanium-200 backdrop-blur-2xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald animate-pulse shrink-0" />
                <span className="text-[11px] leading-tight text-white font-medium truncate">
                  {activeScoutPrompt.promptText}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setActiveScoutPrompt(null);
                    setIsScoutOpen(true);
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white text-obsidian-950 font-bold text-xs hover:brightness-110 shadow-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setActiveScoutPrompt(null);
                    setIsScoutPromptDismissedSession(true);
                    try {
                      sessionStorage.setItem("safetylayer_scout_dismissed", "true");
                    } catch {}
                  }}
                  className="min-h-[36px] min-w-[36px] text-titanium-400 hover:text-white flex items-center justify-center p-1 text-sm rounded-lg hover:bg-white/10"
                  title="Dismiss notice"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Primary Map Libre Component */}
          <SafetyLayerMap
            segments={segments}
            reports={reports}
            routes={routes}
            selectedRoute={selectedRoute}
            onSelectRoute={(r) => setSelectedRoute(r)}
            onSelectSegment={(s) => setSelectedSegment(s)}
            onSelectHazard={(h) => setInspectedHazard(h)}
            onMapClick={handleMapClick}
            center={[origin.lat, origin.lng]}
            userLocation={geoState.coords}
            userAccuracy={geoState.accuracy}
            isLocating={isLocating}
            onLocateMe={handleTriggerLocateMe}
          />

          {/* Primary Floating Action Button (Mobile: Bottom Right, Desktop: Hidden when drawer open) */}
          <button
            onClick={() => setIsReportOpen(true)}
            className="md:hidden absolute bottom-6 right-4 z-30 min-h-[48px] px-4 py-2.5 rounded-full bg-white text-obsidian-950 font-bold text-xs flex items-center gap-2 shadow-2xl hover:brightness-110 active:scale-95 transition-all"
            title="Report an issue"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Report issue</span>
          </button>
        </div>

        {/* Route Options Panel: Bottom Sheet on Mobile / Left Panel on Desktop */}
        <div className="w-full md:w-96 lg:w-[420px] max-h-[48vh] md:max-h-full h-auto md:h-full p-2.5 bg-obsidian-950/95 z-20 border-t md:border-t-0 md:border-l border-white/10 shrink-0">
          <RouteDrawer
            routes={routes}
            selectedRoute={selectedRoute}
            onSelectRoute={(r) => setSelectedRoute(r)}
            travelMode={travelMode}
            onChangeMode={(m) => setTravelMode(m)}
            queryHour={queryHour}
            onChangeHour={(h) => setQueryHour(h)}
            isLoading={isLoadingRoutes}
          />
        </div>
      </div>

      {/* First-Run Welcome Card (Dismissible and remembered) */}
      <WelcomeCard
        isOpen={isWelcomeOpen}
        onClose={handleDismissWelcome}
        onStartDemo={handleStartDemo}
      />

      {/* Location Explanation Prompt Modal */}
      <LocationPromptModal
        isOpen={isLocationPromptOpen}
        onClose={() => setIsLocationPromptOpen(false)}
        onAllow={handleAllowLocationFromPrompt}
        status={geoState.status}
        errorMessage={geoState.errorMessage}
      />

      {/* Hazard Detail Sheet */}
      <HazardDetailSheet
        hazard={inspectedHazard}
        onClose={() => setInspectedHazard(null)}
        onVerify={() => {
          setInspectedHazard(null);
          setIsScoutOpen(true);
        }}
      />

      {/* Simplified Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={handleReportSubmitted}
        initialCoordinates={geoState.coords || { lat: origin.lat, lng: origin.lng }}
        gpsTrail={geoState.trail}
      />

      {/* Scout Missions HUD */}
      <ScoutPanel
        isOpen={isScoutOpen}
        onClose={() => setIsScoutOpen(false)}
        profile={scoutProfile}
        missions={scoutMissions}
        onMissionClaimed={handleMissionClaimed}
      />

      {/* Auto-Drafted Civic Complaint Modal */}
      <CivicComplaintModal
        isOpen={isCivicOpen}
        onClose={() => setIsCivicOpen(false)}
        selectedSegment={selectedSegment}
      />

      {/* Privacy Framework Modal */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Developer and Honesty Transparency Modal */}
      <DeveloperInfoModal
        isOpen={isDevInfoOpen}
        onClose={() => setIsDevInfoOpen(false)}
        gemmaProvider="hosted"
        gemmaModelId="gemma-4-12b-it"
        activeHazardsCount={reports.filter((r) => r.status === "published").length}
      />

      {/* 3-Minute Demo Walkthrough Sequence */}
      <DemoWalkthrough
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onTriggerReport={(simulateSpoof) => {
          setIsReportOpen(true);
        }}
        onToggleSaferRoute={() => {
          if (routes.length >= 2) {
            const alternative = routes.find((r) => r.id === "route_commercial_lit") || routes[1];
            setSelectedRoute(alternative);
          }
        }}
        onOpenCivicComplaint={() => setIsCivicOpen(true)}
        onOpenPrivacySlide={() => setIsPrivacyOpen(true)}
      />
    </div>
  );
}
