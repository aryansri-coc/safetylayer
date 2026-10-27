"use client";

import React, { useEffect, useRef, useState } from "react";
import { HazardReport, RoadSegment, RouteAlternative } from "@/types";
import { AlertCircle, Box, Compass, Crosshair, Eye, Layers, MapPin, Navigation, Shield } from "lucide-react";

interface SafeLayerMapProps {
  segments: RoadSegment[];
  reports: HazardReport[];
  selectedRoute?: RouteAlternative | null;
  onSelectSegment?: (segment: RoadSegment) => void;
  onSelectHazard?: (hazard: HazardReport) => void;
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

export default function SafeLayerMap({
  segments,
  reports,
  selectedRoute,
  onSelectSegment,
  onSelectHazard,
  center = [28.6305, 77.2215], // Connaught Place corridor
  zoom = 15.2,
  userLocation,
  userAccuracy,
  isLocating,
  onLocateMe,
}: SafeLayerMapProps) {
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

      map.on("load", () => {
        mapLibreInstanceRef.current = map;
        renderMapLayers(map, maplibregl);
        updateUserLocationOnMap(map, maplibregl);
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
  }, [segments, reports, selectedRoute, currentZoom]);

  const renderMapLayers = (map: any, maplibregl: any) => {
    if (!map || !map.isStyleLoaded()) return;

    // Clear old DOM markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Draw Road Segments
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

      // Segment casing line
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

      // Segment colored line
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

    // 2. Render Active Route with glow
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
        ? "#64748b" // neutral grey for unmapped stretches
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
            "line-opacity": 0.28,
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
            "line-width": 5.5,
            "line-opacity": 0.9,
          },
        });

        // Core line
        map.addLayer({
          id: "active-route-line",
          type: "line",
          source: "active-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": isNoData ? "#94a3b8" : "#ffffff",
            "line-width": 3,
            "line-opacity": 0.95,
          },
        });
      }

      // Update layer colors
      if (map.getLayer("active-route-glow")) {
        map.setPaintProperty("active-route-glow", "line-color", routeColor);
      }
      if (map.getLayer("active-route-line")) {
        map.setPaintProperty("active-route-line", "line-color", isNoData ? "#94a3b8" : "#ffffff");
      }
    } else if (map.getSource("active-route")) {
      map.getSource("active-route").setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    // 3. Render Hazard Markers (Clustering when zoomed out < 13.8)
    const publishedReports = reports.filter((r) => r.status === "published");
    const zoomLevel = map.getZoom();

    if (zoomLevel < 13.8 && publishedReports.length > 3) {
      // Clustered View: Group reports by spatial proximity
      const clusters: { center: [number, number]; count: number; items: HazardReport[] }[] = [];
      const threshold = 0.008; // ~800 meters

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
        el.className = "cursor-pointer transition-transform hover:scale-110";
        el.innerHTML = `
          <div class="px-2.5 py-1 rounded-full bg-obsidian-900/90 border border-cyber-amber/60 text-white font-mono text-xs font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-cyber-amber animate-pulse"></span>
            <span>${cl.count} issues</span>
          </div>
        `;

        el.addEventListener("click", () => {
          map.easeTo({
            center: [cl.center[1], cl.center[0]],
            zoom: 15.5,
            duration: 800,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cl.center[1], cl.center[0]])
          .addTo(map);

        markersRef.current.push(marker);
      });
    } else {
      // Individual Markers View
      publishedReports.forEach((rep) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer group relative flex flex-col items-center";

        const isHighSeverity = rep.severity >= 4;
        const themeColor =
          isHighSeverity ? "#ff3366" : rep.issue === "lighting" ? "#f5a623" : "#00f5a0";

        // Plain pin with category icon
        const iconChar =
          rep.issue === "lighting"
            ? "⚡"
            : rep.issue === "road_condition"
            ? "▲"
            : rep.issue === "footpath_missing"
            ? "🚶"
            : "!";

        el.innerHTML = `
          <div class="w-7 h-7 rounded-full metallic-panel border border-white/20 shadow-xl flex items-center justify-center transition-transform transform group-hover:scale-125" style="box-shadow: 0 0 10px ${themeColor}50">
            <span style="color: ${themeColor}; font-size: 11px; font-weight: bold;">
              ${iconChar}
            </span>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-8 px-2 py-0.5 rounded text-[11px] whitespace-nowrap metallic-panel border border-white/15 text-white shadow-xl pointer-events-none z-30">
            ${rep.issue.replace("_", " ")}
          </div>
        `;

        el.addEventListener("click", () => {
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

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Locate Me Button */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className={`p-2.5 rounded-xl metallic-panel border border-white/15 text-xs flex items-center justify-center shadow-xl transition-all ${
              userLocation
                ? "text-sky-400 border-sky-400/40 bg-sky-500/10"
                : "text-titanium-300 hover:text-white"
            } ${isLocating ? "animate-pulse" : ""}`}
            title="Locate me (GPS)"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
          </button>
        )}

        {/* 2D / 3D Isometric View Toggle */}
        <button
          onClick={toggle3DCamera}
          className={`p-2.5 rounded-xl metallic-panel border border-white/15 text-xs flex items-center justify-center shadow-xl transition-all ${
            is3DMode
              ? "text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10 font-bold"
              : "text-titanium-400 hover:text-white"
          }`}
          title="Toggle 3D View"
        >
          <span className="text-[10px] font-bold font-mono">{is3DMode ? "3D" : "2D"}</span>
        </button>
      </div>

      {/* Small Map Legend (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-10 px-3 py-2 rounded-xl metallic-panel border border-white/10 shadow-xl text-[11px] text-titanium-300 space-y-1 backdrop-blur-md hidden sm:block">
        <div className="text-[10px] font-mono uppercase tracking-wider text-titanium-500 mb-1">
          Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-emerald" />
          <span>Fewer reported issues</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-amber" />
          <span>Caution reported</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-crimson" />
          <span>High caution / defect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>No reports yet</span>
        </div>
      </div>
    </div>
  );
}
