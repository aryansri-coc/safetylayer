"use client";

import React, { useEffect, useRef, useState } from "react";
import { HazardReport } from "@/types";
import { Activity, AlertTriangle, Box, Compass, Cpu, Crosshair, Eye, Lightbulb, Shield, Sparkles, X } from "lucide-react";

interface HazardInspector3DProps {
  hazard: HazardReport | null;
  onClose: () => void;
}

export default function HazardInspector3D({ hazard, onClose }: HazardInspector3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotationAngle, setRotationAngle] = useState(0.4);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    if (!hazard || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = rotationAngle;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 30;

      if (isRotating) {
        angle += 0.008;
      }

      // Draw 3D Isometric Road Grid
      const gridSize = 14;
      const step = 16;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.save();

      // Render 3D Ground Wireframe Mesh
      ctx.lineWidth = 1;
      for (let x = -gridSize; x <= gridSize; x++) {
        ctx.beginPath();
        for (let z = -gridSize; z <= gridSize; z++) {
          // Calculate surface height anomaly (pothole or obstruction)
          let h = 0;
          const distToCenter = Math.sqrt(x * x + z * z);
          if (hazard.issue === "road_condition" && distToCenter < 5) {
            h = -Math.sin((distToCenter / 5) * Math.PI) * 22; // Pothole depression
          } else if (hazard.issue === "obstruction" && distToCenter < 4) {
            h = Math.sin((distToCenter / 4) * Math.PI) * 18; // Obstruction bump
          }

          // 3D rotation projection
          const rotX = x * step * cosA - z * step * sinA;
          const rotZ = x * step * sinA + z * step * cosA;

          // Isometric projection
          const isoX = cx + (rotX - rotZ) * 0.85;
          const isoY = cy + (rotX + rotZ) * 0.45 + h;

          if (z === -gridSize) {
            ctx.moveTo(isoX, isoY);
          } else {
            ctx.lineTo(isoX, isoY);
          }
        }
        ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
        ctx.stroke();
      }

      for (let z = -gridSize; z <= gridSize; z++) {
        ctx.beginPath();
        for (let x = -gridSize; x <= gridSize; x++) {
          let h = 0;
          const distToCenter = Math.sqrt(x * x + z * z);
          if (hazard.issue === "road_condition" && distToCenter < 5) {
            h = -Math.sin((distToCenter / 5) * Math.PI) * 22;
          } else if (hazard.issue === "obstruction" && distToCenter < 4) {
            h = Math.sin((distToCenter / 4) * Math.PI) * 18;
          }

          const rotX = x * step * cosA - z * step * sinA;
          const rotZ = x * step * sinA + z * step * cosA;
          const isoX = cx + (rotX - rotZ) * 0.85;
          const isoY = cy + (rotX + rotZ) * 0.45 + h;

          if (x === -gridSize) {
            ctx.moveTo(isoX, isoY);
          } else {
            ctx.lineTo(isoX, isoY);
          }
        }
        ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
        ctx.stroke();
      }

      // Render 3D Streetlight Pole Model
      const poleX = 4 * step * cosA - (-4) * step * sinA;
      const poleZ = 4 * step * sinA + (-4) * step * cosA;
      const baseIsoX = cx + (poleX - poleZ) * 0.85;
      const baseIsoY = cy + (poleX + poleZ) * 0.45;
      const poleHeight = 110;
      const topIsoX = baseIsoX;
      const topIsoY = baseIsoY - poleHeight;

      // Pole Line
      ctx.beginPath();
      ctx.moveTo(baseIsoX, baseIsoY);
      ctx.lineTo(topIsoX, topIsoY);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();

      // Lamp Arm
      ctx.beginPath();
      ctx.moveTo(topIsoX, topIsoY);
      ctx.lineTo(topIsoX - 25, topIsoY + 8);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();

      // Lamp Fixture & Illumination Cone
      const lampHeadX = topIsoX - 25;
      const lampHeadY = topIsoY + 8;

      if (hazard.issue === "lighting") {
        // Defective / Dark Lamp (Red dead indicator)
        ctx.fillStyle = "#ff3366";
        ctx.beginPath();
        ctx.arc(lampHeadX, lampHeadY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing warning ring around dead fixture
        ctx.strokeStyle = "rgba(255, 51, 102, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lampHeadX, lampHeadY, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Dark cone overlay
        ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
        ctx.beginPath();
        ctx.moveTo(lampHeadX, lampHeadY);
        ctx.lineTo(baseIsoX - 60, baseIsoY + 20);
        ctx.lineTo(baseIsoX + 60, baseIsoY + 20);
        ctx.closePath();
        ctx.fill();
      } else {
        // Operational Lamp
        ctx.fillStyle = "#00f5a0";
        ctx.beginPath();
        ctx.arc(lampHeadX, lampHeadY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Luminous light cone
        const coneGrad = ctx.createLinearGradient(lampHeadX, lampHeadY, baseIsoX, baseIsoY);
        coneGrad.addColorStop(0, "rgba(0, 245, 160, 0.35)");
        coneGrad.addColorStop(1, "rgba(0, 245, 160, 0.0)");
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lampHeadX, lampHeadY);
        ctx.lineTo(baseIsoX - 70, baseIsoY + 25);
        ctx.lineTo(baseIsoX + 70, baseIsoY + 25);
        ctx.closePath();
        ctx.fill();
      }

      // Anomaly Target Pin in 3D Center
      const pinX = 0;
      const pinZ = 0;
      const pinBaseX = cx;
      const pinBaseY = cy;

      // Laser vertical beacon
      const beamGrad = ctx.createLinearGradient(pinBaseX, pinBaseY, pinBaseX, pinBaseY - 90);
      beamGrad.addColorStop(0, hazard.severity >= 4 ? "rgba(255, 51, 102, 0.85)" : "rgba(245, 166, 35, 0.85)");
      beamGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pinBaseX, pinBaseY);
      ctx.lineTo(pinBaseX, pinBaseY - 90);
      ctx.stroke();

      // Pin floating node
      ctx.fillStyle = hazard.severity >= 4 ? "#ff3366" : "#f5a623";
      ctx.beginPath();
      ctx.arc(pinBaseX, pinBaseY - 90, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hazard, isRotating]);

  if (!hazard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl metallic-panel p-6 rounded-2xl border border-white/10 shadow-2xl text-titanium-200 flex flex-col md:flex-row gap-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-obsidian-800 text-titanium-400 hover:text-white hover:bg-obsidian-700 border border-white/10 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 3D Wireframe Canvas Column */}
        <div className="flex-1 flex flex-col items-center justify-center bg-obsidian-950/80 rounded-xl border border-white/10 p-3 relative overflow-hidden">
          {/* Telemetry Header */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-white/5 text-[11px] font-mono text-titanium-400">
            <div className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>3D LIDAR ROADWAY INSPECTION</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRotating(!isRotating)}
                className="px-2 py-0.5 rounded bg-obsidian-800 hover:bg-obsidian-700 text-titanium-300 border border-white/10 text-[10px]"
              >
                {isRotating ? "Pause Orbit" : "Resume Orbit"}
              </button>
              <span className="text-cyber-emerald flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-ping" />
                ONLINE
              </span>
            </div>
          </div>

          {/* Interactive 3D Canvas */}
          <canvas
            ref={canvasRef}
            width={460}
            height={360}
            className="w-full h-auto cursor-grab active:cursor-grabbing"
          />

          {/* Canvas HUD Overlay Footer */}
          <div className="w-full flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono text-titanium-500">
            <span>GRID: 28x28 ISOMETRIC PROJECTION</span>
            <span>ELEVATION ANOMALY: {hazard.severity >= 4 ? "-22cm (CRITICAL)" : "0cm"}</span>
            <span>BEAM: RAYTRACED</span>
          </div>
        </div>

        {/* Gemma 4 & Trust Telemetry Breakdown */}
        <div className="w-full md:w-80 flex flex-col justify-between space-y-4 text-xs font-sans">
          {/* Title & Badge */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded metallic-chip text-cyber-cyan border border-cyber-cyan/30">
                HAZARD_ID: {hazard.id.slice(0, 10)}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  hazard.severity >= 4
                    ? "bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40"
                    : "bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40"
                }`}
              >
                LEVEL {hazard.severity}/5
              </span>
            </div>
            <h3 className="text-base font-bold text-white capitalize">
              {hazard.issue.replace("_", " ")} Assessment
            </h3>
            <p className="text-[11px] text-titanium-400 font-mono mt-0.5">
              LAT: {hazard.coordinates.lat.toFixed(4)}° | LNG: {hazard.coordinates.lng.toFixed(4)}°
            </p>
          </div>

          {/* Report Summary & Speech Transcript */}
          <div className="p-3 rounded-xl bg-obsidian-900/90 border border-white/10 space-y-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-titanium-500 block">
                Multimodal Summary
              </span>
              <p className="text-xs text-white font-medium leading-relaxed mt-0.5">
                "{hazard.summary}"
              </p>
            </div>
            {hazard.rawClaim && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-titanium-500 block">
                  Raw Commuter Claim ({hazard.language})
                </span>
                <p className="text-[11px] text-cyber-cyan font-mono italic mt-0.5">
                  "{hazard.rawClaim}"
                </p>
              </div>
            )}
          </div>

          {/* Gemma 4 Model Telemetry */}
          <div className="p-3 rounded-xl bg-obsidian-900/90 border border-white/10 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between text-titanium-400">
              <span className="flex items-center gap-1.5 text-cyber-emerald">
                <Sparkles className="w-3.5 h-3.5" /> Gemma 4 Confidence:
              </span>
              <span className="font-bold text-white">{Math.round(hazard.confidence * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyber-emerald rounded-full"
                style={{ width: `${hazard.confidence * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-titanium-400 pt-1">
              <span className="flex items-center gap-1.5 text-cyber-cyan">
                <Shield className="w-3.5 h-3.5" /> Presence Verification:
              </span>
              <span className="font-bold text-cyber-emerald">
                {hazard.presenceVerified ? "CONFIRMED (22 km/h)" : "FLAGGED"}
              </span>
            </div>

            <div className="flex items-center justify-between text-titanium-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-titanium-400" /> Corroborated Reports:
              </span>
              <span className="font-bold text-white">{hazard.verifiedCount} independent</span>
            </div>
          </div>

          {/* Action / Dismiss */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] font-mono text-titanium-500">
              TEMPORAL: {hazard.timeRelevance.toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-obsidian-800 hover:bg-obsidian-700 text-white border border-white/10 transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
