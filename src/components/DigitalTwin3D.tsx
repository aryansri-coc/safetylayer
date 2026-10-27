"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  AlertTriangle,
  Compass,
  Eye,
  Layers,
  Lightbulb,
  Maximize2,
  Moon,
  Rotate3d,
  Shield,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";

interface HazardNode {
  id: string;
  name: string;
  type: "pothole" | "lighting" | "waterlogging" | "obstruction";
  severity: number;
  x: number;
  z: number;
  desc: string;
  gemmaReasoning: string;
  corroborations: number;
}

const SAMPLE_HAZARDS: HazardNode[] = [
  {
    id: "h1",
    name: "Severe Pothole Cluster",
    type: "pothole",
    severity: 4,
    x: -12,
    z: -4,
    desc: "Multiple 15cm road craters on inner turn",
    gemmaReasoning: "Gemma 4 extracted high-impact wheel deformation hazard from Hinglish audio claim and dashcam frame.",
    corroborations: 5,
  },
  {
    id: "h2",
    name: "Streetlight Failure Corridor",
    type: "lighting",
    severity: 5,
    x: 4,
    z: -14,
    desc: "350m completely unlit nocturnal corridor",
    gemmaReasoning: "Gemma 4 classified zero lux illumination levels; elevated walking risk multiplier from 1.0x to 2.85x.",
    corroborations: 8,
  },
  {
    id: "h3",
    name: "Monsoon Waterlogging",
    type: "waterlogging",
    severity: 3,
    x: 16,
    z: 10,
    desc: "Knee-deep submerged curbside underpass",
    gemmaReasoning: "Gemma 4 identified submerged lane markings; recommended two-wheeler diversion.",
    corroborations: 4,
  },
];

export default function DigitalTwin3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedHazard, setSelectedHazard] = useState<HazardNode | null>(SAMPLE_HAZARDS[1]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [isNightMode, setIsNightMode] = useState(true);
  const [isRotating, setIsRotating] = useState(true);

  // Keep references to Three.js objects for dynamic updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reqIdRef = useRef<number | null>(null);
  const safeLineRef = useRef<THREE.Line | null>(null);
  const riskyLineRef = useRef<THREE.Line | null>(null);
  const hazardGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.015);

    // Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(38, 42, 48);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      console.warn("WebGL not available:", e);
      return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isNightMode ? 0.35 : 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d9f5, isNightMode ? 0.8 : 1.5);
    dirLight.position.set(30, 50, 30);
    scene.add(dirLight);

    const emeraldLight = new THREE.PointLight(0x00f5a0, isNightMode ? 2.5 : 1.0, 60);
    emeraldLight.position.set(-10, 15, -10);
    scene.add(emeraldLight);

    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 3D City Ground Grid
    const gridHelper = new THREE.GridHelper(90, 45, 0x00d9f5, 0x1b2133);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // City Building Blocks (Holographic Obsidian Prisms)
    const buildingGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x0e111a,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x272f47, transparent: true, opacity: 0.6 });

    // Seed realistic city blocks
    const blockPositions = [
      { x: -22, z: -22, w: 10, d: 8, h: 14 },
      { x: -22, z: -8, w: 8, d: 10, h: 22 },
      { x: -22, z: 8, w: 9, d: 9, h: 18 },
      { x: -22, z: 22, w: 11, d: 8, h: 12 },

      { x: -6, z: -24, w: 8, d: 8, h: 16 },
      { x: -6, z: 24, w: 8, d: 8, h: 10 },

      { x: 10, z: -22, w: 10, d: 9, h: 20 },
      { x: 10, z: -6, w: 8, d: 7, h: 26 },
      { x: 10, z: 8, w: 9, d: 8, h: 15 },
      { x: 10, z: 22, w: 10, d: 8, h: 19 },

      { x: 26, z: -18, w: 8, d: 12, h: 14 },
      { x: 26, z: 4, w: 9, d: 11, h: 17 },
      { x: 26, z: 20, w: 8, d: 9, h: 11 },
    ];

    blockPositions.forEach((b) => {
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.position.set(b.x, b.h / 2, b.z);
      buildingGroup.add(mesh);

      // Neon Wireframe Edges
      const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w, b.h, b.d));
      const wire = new THREE.LineSegments(wireGeo, edgeMat);
      wire.position.copy(mesh.position);
      buildingGroup.add(wire);
    });
    scene.add(buildingGroup);

    // Arterial Road Geometry
    const roadMat = new THREE.LineBasicMaterial({ color: 0x00d9f5, linewidth: 2, transparent: true, opacity: 0.5 });
    const roadNetwork = new THREE.Group();

    // Longitudinal and transversal roads
    const roadCoords = [
      [new THREE.Vector3(-35, 0.1, -15), new THREE.Vector3(35, 0.1, -15)],
      [new THREE.Vector3(-35, 0.1, 0), new THREE.Vector3(35, 0.1, 0)],
      [new THREE.Vector3(-35, 0.1, 15), new THREE.Vector3(35, 0.1, 15)],
      [new THREE.Vector3(-14, 0.1, -35), new THREE.Vector3(-14, 0.1, 35)],
      [new THREE.Vector3(2, 0.1, -35), new THREE.Vector3(2, 0.1, 35)],
      [new THREE.Vector3(18, 0.1, -35), new THREE.Vector3(18, 0.1, 35)],
    ];

    roadCoords.forEach((pts) => {
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const road = new THREE.Line(geom, roadMat);
      roadNetwork.add(road);
    });
    scene.add(roadNetwork);

    // --- Dynamic Routes ---
    // 1. Risky Route (Traditional GPS: shortcuts through unlit alley and potholes)
    const riskyPts = [
      new THREE.Vector3(-28, 0.2, 15),
      new THREE.Vector3(-14, 0.2, 15),
      new THREE.Vector3(-14, 0.2, -4), // Pothole zone
      new THREE.Vector3(2, 0.2, -14),  // Unlit corridor
      new THREE.Vector3(24, 0.2, -15),
    ];
    const riskyCurve = new THREE.CatmullRomCurve3(riskyPts);
    const riskyGeo = new THREE.BufferGeometry().setFromPoints(riskyCurve.getPoints(50));
    const riskyMat = new THREE.LineDashedMaterial({
      color: 0xff3366,
      linewidth: 3,
      scale: 1,
      dashSize: 1.5,
      gapSize: 0.8,
    });
    const riskyLine = new THREE.Line(riskyGeo, riskyMat);
    riskyLine.computeLineDistances();
    scene.add(riskyLine);
    riskyLineRef.current = riskyLine;

    // 2. SafetyLayer Recommended Safe Route (Illuminated, verified zero hazards)
    const safePts = [
      new THREE.Vector3(-28, 0.35, 15),
      new THREE.Vector3(-28, 0.35, 0),
      new THREE.Vector3(-14, 0.35, 0),
      new THREE.Vector3(2, 0.35, 0),
      new THREE.Vector3(18, 0.35, 0),
      new THREE.Vector3(18, 0.35, -15),
      new THREE.Vector3(24, 0.35, -15),
    ];
    const safeCurve = new THREE.CatmullRomCurve3(safePts);
    const safeGeo = new THREE.BufferGeometry().setFromPoints(safeCurve.getPoints(80));
    const safeMat = new THREE.LineBasicMaterial({
      color: 0x00f5a0,
      linewidth: 4,
    });
    const safeLine = new THREE.Line(safeGeo, safeMat);
    scene.add(safeLine);
    safeLineRef.current = safeLine;

    // Glowing Pulse along Safe Route
    const pulseGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00f5a0 });
    const safePulse = new THREE.Mesh(pulseGeo, pulseMat);
    scene.add(safePulse);

    // Hazard Nodes in 3D
    const hazardGroup = new THREE.Group();
    hazardGroupRef.current = hazardGroup;

    SAMPLE_HAZARDS.forEach((h) => {
      // Beacon cylinder
      const col = h.type === "lighting" ? 0xf5a623 : h.type === "pothole" ? 0xff3366 : 0x00d9f5;
      const beaconGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 16);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.7,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(h.x, 3, h.z);
      hazardGroup.add(beacon);

      // Floating Orb
      const orbGeo = new THREE.SphereGeometry(0.9, 16, 16);
      const orbMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.8,
        roughness: 0.1,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(h.x, 6.5, h.z);
      hazardGroup.add(orb);

      // Pulsing Radar Rings
      const ringGeo = new THREE.RingGeometry(1.5, 2.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(h.x, 0.2, h.z);
      hazardGroup.add(ring);
    });
    scene.add(hazardGroup);

    // Mouse Controls (Rotate & Zoom via drag)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = {
      radius: 65,
      theta: Math.PI / 4,
      phi: Math.PI / 3.2,
    };

    const updateCameraFromSpherical = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraFromSpherical();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= deltaX * 0.008;
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.1, spherical.phi - deltaY * 0.008));
      updateCameraFromSpherical();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(25, Math.min(100, spherical.radius + e.deltaY * 0.05));
      updateCameraFromSpherical();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation Loop
    let clock = new THREE.Clock();
    let pulseT = 0;

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Auto rotation if enabled and not currently dragging
      if (isRotating && !isDragging) {
        spherical.theta += 0.0025;
        updateCameraFromSpherical();
      }

      // Safe pulse traversal
      pulseT = (pulseT + delta * 0.3) % 1;
      const pt = safeCurve.getPoint(pulseT);
      safePulse.position.copy(pt);

      // Floating hazard bobbing
      hazardGroup.children.forEach((child, idx) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
          child.position.y = 6.5 + Math.sin(time * 3 + idx) * 0.4;
        }
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          const scale = 1 + (Math.sin(time * 2.5 + idx) * 0.3);
          child.scale.set(scale, scale, scale);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domElement.removeEventListener("mousedown", onMouseDown);
      domElement.removeEventListener("wheel", onWheel);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [isRotating, isNightMode]);

  // Handle visibility toggles
  useEffect(() => {
    if (safeLineRef.current) safeLineRef.current.visible = showRoutes;
    if (riskyLineRef.current) riskyLineRef.current.visible = showRoutes;
  }, [showRoutes]);

  useEffect(() => {
    if (hazardGroupRef.current) hazardGroupRef.current.visible = showHazards;
  }, [showHazards]);

  return (
    <div className="relative w-full rounded-2xl md:rounded-3xl border border-white/10 bg-obsidian-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top 3D Header Bar */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-obsidian-950/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyber-emerald/10 border border-cyber-emerald/30 flex items-center justify-center">
            <Rotate3d className="w-4 h-4 text-cyber-emerald animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                Interactive 3D Digital Twin City Model
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30">
                THREE.JS WEBGL
              </span>
            </div>
            <p className="text-xs text-titanium-400">
              Real-time spatial simulation of road hazards, lighting corridors, and multi-objective path routing.
            </p>
          </div>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              isRotating
                ? "bg-white/15 text-white border border-white/30"
                : "bg-obsidian-850 text-titanium-400 border border-white/10 hover:text-white"
            }`}
            title="Toggle Auto-Orbit"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isRotating ? "Orbiting" : "Paused"}</span>
          </button>

          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              isNightMode
                ? "bg-cyber-violet/20 text-cyber-violet border border-cyber-violet/40"
                : "bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40"
            }`}
            title="Toggle Night / Diurnal Lighting"
          >
            {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{isNightMode ? "Night Commute" : "Day Commute"}</span>
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              showRoutes
                ? "bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40"
                : "bg-obsidian-850 text-titanium-400 border border-white/10"
            }`}
            title="Toggle Route Comparison"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Routes</span>
          </button>

          <button
            onClick={() => setShowHazards(!showHazards)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              showHazards
                ? "bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40"
                : "bg-obsidian-850 text-titanium-400 border border-white/10"
            }`}
            title="Toggle Hazard Radar Pins"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hazards</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div className="relative w-full h-[360px] sm:h-[460px] md:h-[500px] cursor-grab active:cursor-grabbing">
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Overlay Badges: Legend & Interaction Guidance */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2 max-w-xs">
          <div className="bg-obsidian-950/90 border border-white/15 p-2.5 rounded-xl shadow-xl backdrop-blur-md text-[11px] font-sans space-y-1.5">
            <div className="font-mono text-[10px] text-titanium-400 uppercase tracking-wider font-bold">
              Dynamic Dual-Route Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded bg-cyber-emerald" />
              <span className="text-white font-medium">SafetyLayer Route:</span>
              <span className="text-cyber-emerald font-mono">11m (0 Hazards)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded bg-cyber-crimson" />
              <span className="text-titanium-300">Default GPS Path:</span>
              <span className="text-cyber-crimson font-mono">9m (2 Hazards)</span>
            </div>
          </div>
          <div className="bg-obsidian-950/80 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] text-titanium-400 font-mono">
            💡 Drag to rotate camera • Scroll to zoom in/out
          </div>
        </div>

        {/* Hazard Selector Quick Chips */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 max-w-xs">
          <div className="bg-obsidian-950/90 border border-white/15 p-2.5 rounded-xl shadow-xl backdrop-blur-md text-xs space-y-2">
            <div className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider font-bold flex items-center justify-between">
              <span>Active Hazard Radar</span>
              <span className="w-2 h-2 rounded-full bg-cyber-crimson animate-ping" />
            </div>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_HAZARDS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHazard(h)}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                    selectedHazard?.id === h.id
                      ? "bg-white/20 text-white font-bold border border-white/30"
                      : "bg-obsidian-900/80 text-titanium-300 hover:text-white border border-white/5"
                  }`}
                >
                  <span className="truncate">{h.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      h.type === "lighting"
                        ? "bg-cyber-amber/20 text-cyber-amber"
                        : h.type === "pothole"
                        ? "bg-cyber-crimson/20 text-cyber-crimson"
                        : "bg-cyber-cyan/20 text-cyber-cyan"
                    }`}
                  >
                    Sev {h.severity}/5
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Inspector Card for the selected Hazard */}
        {selectedHazard && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-10 bg-obsidian-950/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    selectedHazard.type === "lighting"
                      ? "bg-cyber-amber/20 text-cyber-amber"
                      : selectedHazard.type === "pothole"
                      ? "bg-cyber-crimson/20 text-cyber-crimson"
                      : "bg-cyber-cyan/20 text-cyber-cyan"
                  }`}
                >
                  {selectedHazard.type === "lighting" ? (
                    <Lightbulb className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs leading-none">
                    {selectedHazard.name}
                  </h4>
                  <p className="text-[10px] text-titanium-400 mt-0.5 font-mono">
                    Corroborated by {selectedHazard.corroborations} verified scouts
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40">
                CRITICAL
              </span>
            </div>

            <p className="text-titanium-200 text-[11px] leading-relaxed">
              {selectedHazard.desc}
            </p>

            {/* Gemma 4 Intelligence Reasoning Pill */}
            <div className="p-2.5 rounded-xl bg-obsidian-900 border border-cyber-emerald/30 space-y-1">
              <div className="flex items-center gap-1.5 text-cyber-emerald font-mono font-bold text-[10px]">
                <Sparkles className="w-3 h-3" />
                <span>GEMMA 4 REASONING ENGINE</span>
              </div>
              <p className="text-titanium-300 text-[10.5px] leading-snug">
                {selectedHazard.gemmaReasoning}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
