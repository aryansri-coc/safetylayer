"use client";

import React, { useEffect, useRef, useState } from "react";
import { HazardReport, RoadSegment, RouteAlternative } from "@/types";
import { AlertCircle, Box, Compass, Crosshair, Eye, HelpCircle, Layers, MapPin, Navigation, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

interface SafetyLayerMapProps {
  segments: RoadSegment[];
  reports: HazardReport[];
  routes?: RouteAlternative[];
  selectedRoute?: RouteAlternative | null;
  onSelectRoute?: (route: RouteAlternative) => void;
  onSelectSegment?: (segment: RoadSegment) => void;
  onSelectHazard?: (hazard: HazardReport) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  center?: [number, number];
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  userAccuracy?: number | null;
  isLocating?: boolean;
  onLocateMe?: () => void;
}

/**
 * Generate circular polygon coordinates around a center point for GPS accuracy visualization
 */
function createCircleGeoJSON(centerLat: number, centerLng: number, radiusMeters: number) {
  const points = 48;
  const coords: [number, number][] = [];
  const km = Math.max(15, radiusMeters) / 1000;
  const distanceX = km / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }
  coords.push(coords[0]); // close polygon

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
  };
}

export default function SafetyLayerMap({
  segments,
  reports,
  routes = [],
  selectedRoute,
  onSelectRoute,
  onSelectSegment,
  onSelectHazard,
  onMapClick,
  center = [28.6305, 77.2215], // Connaught Place corridor
  zoom = 15.2,
  userLocation,
  userAccuracy,
  isLocating,
  onLocateMe,
}: SafetyLayerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapLibreInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  useEffect(() => {
    initMapLibre();

    return () => {
      if (mapLibreInstanceRef.current) {
        mapLibreInstanceRef.current.remove();
        mapLibreInstanceRef.current = null;
      }
    };
  }, []);

  const initMapLibre = async () => {
    if (!mapContainerRef.current) return;
    try {
      const maplibregl = (await import("maplibre-gl")).default;

      if (mapLibreInstanceRef.current) {
        mapLibreInstanceRef.current.remove();
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        center: [center[1], center[0]], // [lng, lat]
        zoom: zoom,
        pitch: is3DMode ? 45 : 0,
        bearing: 0,
        antialias: true,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
        "bottom-right"
      );

      map.on("zoom", () => {
        setCurrentZoom(map.getZoom());
      });

      // Handle map click to set destination ("pick on the map")
      map.on("click", (e: any) => {
        // Check if click was on a feature
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["road-segments-line", "active-route-line", "inactive-routes-line"],
        });
        if (features && features.length > 0) {
          // Feature click handled by layer listeners
          return;
        }
        if (onMapClick) {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      });

      map.on("load", () => {
        mapLibreInstanceRef.current = map;
        renderMapLayers(map, maplibregl);
        updateUserLocationOnMap(map, maplibregl);
        fitRouteBounds(map, maplibregl);
      });
    } catch (err) {
      console.error("MapLibre init error:", err);
    }
  };

  // Toggle 2D Flat vs 3D Isometric View
  const toggle3DCamera = () => {
    const map = mapLibreInstanceRef.current;
    if (!map) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);

    map.easeTo({
      pitch: next3D ? 45 : 0,
      duration: 1000,
    });
  };

  // Auto-fit bounds to selected route
  const fitRouteBounds = (map: any, maplibregl: any) => {
    if (!map || !selectedRoute || !selectedRoute.polyline || selectedRoute.polyline.length === 0) return;
    try {
      const bounds = new maplibregl.LngLatBounds();
      selectedRoute.polyline.forEach(([lat, lng]) => {
        bounds.extend([lng, lat]);
      });

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      map.fitBounds(bounds, {
        padding: isMobile
          ? { top: 90, bottom: 200, left: 30, right: 30 }
          : { top: 80, bottom: 80, left: 380, right: 80 },
        maxZoom: 16.5,
        duration: 900,
      });
    } catch (err) {
      console.warn("fitBounds error:", err);
    }
  };

  // Fit bounds when selected route changes
  useEffect(() => {
    if (!mapLibreInstanceRef.current) return;
    import("maplibre-gl").then((mod) => {
      fitRouteBounds(mapLibreInstanceRef.current, mod.default);
    });
  }, [selectedRoute?.id]);

  // Update user GPS location dot and accuracy circle
  useEffect(() => {
    if (!mapLibreInstanceRef.current) return;
    import("maplibre-gl").then((mod) => {
      updateUserLocationOnMap(mapLibreInstanceRef.current, mod.default);
    });
  }, [userLocation, userAccuracy]);

  const updateUserLocationOnMap = (map: any, maplibregl: any) => {
    if (!map || !map.isStyleLoaded()) return;

    if (userLocation) {
      // 1. Render or update blue accuracy circle layer
      const accuracyCircle = createCircleGeoJSON(
        userLocation.lat,
        userLocation.lng,
        userAccuracy || 40
      );

      if (map.getSource("user-accuracy")) {
        map.getSource("user-accuracy").setData(accuracyCircle);
      } else {
        map.addSource("user-accuracy", {
          type: "geojson",
          data: accuracyCircle,
        });

        map.addLayer({
          id: "user-accuracy-fill",
          type: "fill",
          source: "user-accuracy",
          paint: {
            "fill-color": "#38bdf8",
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: "user-accuracy-outline",
          type: "line",
          source: "user-accuracy",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 1.5,
            "line-opacity": 0.5,
          },
        });
      }

      // 2. Render user location blue dot with pulsing ring
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center pointer-events-none";
        el.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-sky-400/30 animate-ping absolute"></div>
          <div class="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg relative z-10"></div>
        `;

        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (map.getSource("user-accuracy")) {
        map.getSource("user-accuracy").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  };

  // Re-render layers and markers when segments, reports, or selected route changes
  useEffect(() => {
    if (!mapLibreInstanceRef.current) return;
    import("maplibre-gl").then((module) => {
      renderMapLayers(mapLibreInstanceRef.current, module.default);
    });
  }, [segments, reports, routes, selectedRoute, currentZoom]);

  const renderMapLayers = (map: any, maplibregl: any) => {
    if (!map || !map.isStyleLoaded()) return;

    // Clear old DOM markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Draw Road Segments (Baseline roads)
    const segmentFeatures = segments.map((seg) => {
      const risk = seg.compositeRisk.nightRisk || seg.baselinePrior.priorHazardScore;
      const color = risk > 0.6 ? "#ff3366" : risk > 0.35 ? "#f5a623" : "#00f5a0";

      return {
        type: "Feature" as const,
        properties: {
          id: seg.id,
          name: seg.name,
          color,
          risk,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: seg.geometry.map(([lat, lng]) => [lng, lat]),
        },
      };
    });

    const segmentsSourceData = {
      type: "FeatureCollection" as const,
      features: segmentFeatures,
    };

    if (map.getSource("road-segments")) {
      map.getSource("road-segments").setData(segmentsSourceData);
    } else {
      map.addSource("road-segments", {
        type: "geojson",
        data: segmentsSourceData,
      });

      map.addLayer({
        id: "road-segments-casing",
        type: "line",
        source: "road-segments",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#06070a",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "road-segments-line",
        type: "line",
        source: "road-segments",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });

      map.on("click", "road-segments-line", (e: any) => {
        if (e.features && e.features[0]) {
          const segId = e.features[0].properties.id;
          const matched = segments.find((s) => s.id === segId);
          if (matched && onSelectSegment) {
            onSelectSegment(matched);
          }
        }
      });
    }

    // 2. Render Inactive (Alternative) Routes Dimmed
    const inactiveRoutes = routes.filter((r) => r.id !== selectedRoute?.id);
    const inactiveFeatures = inactiveRoutes.map((r) => ({
      type: "Feature" as const,
      properties: {
        id: r.id,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: r.polyline.map(([lat, lng]) => [lng, lat]),
      },
    }));

    const inactiveSourceData = {
      type: "FeatureCollection" as const,
      features: inactiveFeatures,
    };

    if (map.getSource("inactive-routes")) {
      map.getSource("inactive-routes").setData(inactiveSourceData);
    } else {
      map.addSource("inactive-routes", {
        type: "geojson",
        data: inactiveSourceData,
      });

      map.addLayer({
        id: "inactive-routes-casing",
        type: "line",
        source: "inactive-routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#06070a",
          "line-width": 5,
          "line-opacity": 0.5,
        },
      });

      map.addLayer({
        id: "inactive-routes-line",
        type: "line",
        source: "inactive-routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#64748b",
          "line-width": 3.5,
          "line-opacity": 0.45,
          "line-dasharray": [2, 1],
        },
      });

      map.on("click", "inactive-routes-line", (e: any) => {
        if (e.features && e.features[0]) {
          const rId = e.features[0].properties.id;
          const matched = routes.find((r) => r.id === rId);
          if (matched && onSelectRoute) {
            onSelectRoute(matched);
          }
        }
      });
    }

    // 3. Render Active Selected Route with Vibrant Laser Glow
    if (selectedRoute && selectedRoute.polyline && selectedRoute.polyline.length > 0) {
      const routeCoordinates = selectedRoute.polyline.map(([lat, lng]) => [lng, lat]);
      const routeGeoJSON = {
        type: "Feature" as const,
        properties: {
          category: selectedRoute.riskCategory,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: routeCoordinates,
        },
      };

      const isNoData =
        selectedRoute.dataSource === "no_data_yet" || selectedRoute.coveragePercentage === 0;

      const routeColor = isNoData
        ? "#94a3b8" // neutral grey for unmapped stretches
        : selectedRoute.riskCategory === "elevated_risk"
        ? "#ff3366"
        : selectedRoute.riskCategory === "moderate_caution"
        ? "#f5a623"
        : "#00f5a0";

      if (map.getSource("active-route")) {
        map.getSource("active-route").setData(routeGeoJSON);
      } else {
        map.addSource("active-route", {
          type: "geojson",
          data: routeGeoJSON,
        });

        // Laser aura / glow underlay
        map.addLayer({
          id: "active-route-glow",
          type: "line",
          source: "active-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": routeColor,
            "line-width": 14,
            "line-opacity": 0.35,
            "line-blur": 4,
          },
        });

        // Dark outer precision frame
        map.addLayer({
          id: "active-route-casing",
          type: "line",
          source: "active-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#06070a",
            "line-width": 6,
            "line-opacity": 0.95,
          },
        });

        // Core high-contrast line
        map.addLayer({
          id: "active-route-line",
          type: "line",
          source: "active-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": isNoData ? "#94a3b8" : routeColor,
            "line-width": 4,
            "line-opacity": 0.98,
          },
        });
      }

      // Update layer colors
      if (map.getLayer("active-route-glow")) {
        map.setPaintProperty("active-route-glow", "line-color", routeColor);
      }
      if (map.getLayer("active-route-line")) {
        map.setPaintProperty("active-route-line", "line-color", isNoData ? "#94a3b8" : routeColor);
      }
    } else if (map.getSource("active-route")) {
      map.getSource("active-route").setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // 4. Render Hazard Markers (Always render visible pins above route)
    const publishedReports = reports.filter((r) => r.status === "published");
    const zoomLevel = map.getZoom();

    if (zoomLevel < 12.5 && publishedReports.length > 5) {
      // Clustered View when zoomed far out
      const clusters: { center: [number, number]; count: number; items: HazardReport[] }[] = [];
      const threshold = 0.015;

      publishedReports.forEach((rep) => {
        let matchedCluster = clusters.find(
          (c) =>
            Math.abs(c.center[0] - rep.coordinates.lat) < threshold &&
            Math.abs(c.center[1] - rep.coordinates.lng) < threshold
        );

        if (matchedCluster) {
          matchedCluster.count++;
          matchedCluster.items.push(rep);
        } else {
          clusters.push({
            center: [rep.coordinates.lat, rep.coordinates.lng],
            count: 1,
            items: [rep],
          });
        }
      });

      clusters.forEach((cl) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer transition-transform hover:scale-110 z-20";
        el.innerHTML = `
          <div class="px-2.5 py-1 rounded-full bg-obsidian-950 border border-cyber-amber/60 text-white font-mono text-xs font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-cyber-amber animate-pulse"></span>
            <span>${cl.count} issues</span>
          </div>
        `;

        el.addEventListener("click", () => {
          map.easeTo({
            center: [cl.center[1], cl.center[0]],
            zoom: 15.2,
            duration: 800,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cl.center[1], cl.center[0]])
          .addTo(map);

        markersRef.current.push(marker);
      });
    } else {
      // Individual Markers View: High-contrast pins directly visible over routes
      publishedReports.forEach((rep) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer group relative flex flex-col items-center z-20";

        const isHighSeverity = rep.severity >= 4;
        const themeColor =
          isHighSeverity ? "#ff3366" : rep.issue === "lighting" ? "#f5a623" : "#00f5a0";

        const iconChar =
          rep.issue === "lighting"
            ? "⚡"
            : rep.issue === "road_condition"
            ? "▲"
            : rep.issue === "footpath_missing"
            ? "🚶"
            : "!";

        el.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-obsidian-950 border-2 border-white/40 shadow-2xl flex items-center justify-center transition-transform transform group-hover:scale-125" style="box-shadow: 0 0 12px ${themeColor}70">
            <span style="color: ${themeColor}; font-size: 13px; font-weight: 800;">
              ${iconChar}
            </span>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-9 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap bg-obsidian-950 border border-white/20 text-white shadow-2xl pointer-events-none z-30 font-medium">
            ${rep.issue.replace(/_/g, " ")} (${rep.severity >= 4 ? "High caution" : "Moderate"})
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onSelectHazard) onSelectHazard(rep);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rep.coordinates.lng, rep.coordinates.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-obsidian-950 font-sans">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls (Top Right, safe margin from search bar) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Locate Me Button (B6 accessible label and tooltip) */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-obsidian-950/90 border border-white/15 text-xs flex items-center justify-center shadow-xl transition-all ${
              userLocation
                ? "text-sky-400 border-sky-400/50 bg-sky-500/15"
                : "text-titanium-200 hover:text-white hover:bg-obsidian-800"
            } ${isLocating ? "animate-pulse" : ""}`}
            title="Show my location"
            aria-label="Show my location"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
          </button>
        )}

        {/* 2D / 3D Isometric View Toggle */}
        <button
          onClick={toggle3DCamera}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-obsidian-950/90 border border-white/15 text-xs flex items-center justify-center shadow-xl transition-all ${
            is3DMode
              ? "text-cyber-cyan border-cyber-cyan/50 bg-cyber-cyan/15 font-bold"
              : "text-titanium-300 hover:text-white hover:bg-obsidian-800"
          }`}
          title="Toggle 2D / 3D map view"
          aria-label="Toggle 2D / 3D map view"
        >
          <span className="text-xs font-bold font-mono">{is3DMode ? "3D" : "2D"}</span>
        </button>
      </div>

      {/* Small Map Colour Legend (C2: amber/red/grey/green meaning) */}
      <div className="absolute bottom-6 left-4 z-10 px-3 py-2.5 rounded-xl bg-obsidian-950/90 border border-white/15 shadow-2xl text-[11px] text-titanium-200 space-y-1.5 backdrop-blur-md hidden sm:block">
        <div className="text-[10px] font-mono uppercase tracking-wider text-titanium-400 mb-1 font-semibold">
          Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald" />
          <span>Fewer reported issues</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-amber" />
          <span>Caution reported (Some)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-crimson" />
          <span>High caution / defect (Many)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span>No reports yet</span>
        </div>
      </div>
    </div>
  );
}
