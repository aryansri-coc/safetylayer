"use client";

import React from "react";
import { HazardReport } from "@/types";
import { AlertTriangle, CheckCircle2, Clock, Footprints, Info, MapPin, Shield, Users, X, Zap } from "lucide-react";

interface HazardDetailSheetProps {
  hazard: HazardReport | null;
  onClose: () => void;
  onVerify?: (hazard: HazardReport) => void;
  onInspect3D?: (hazard: HazardReport) => void;
}

const ISSUE_LABELS: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  lighting: {
    label: "Lighting Issue",
    desc: "Streetlights are inactive or insufficient, causing low visibility at night.",
    icon: <Zap className="w-4 h-4 text-cyber-amber" />,
  },
  road_condition: {
    label: "Road Condition",
    desc: "Potholes, broken asphalt, or open trenches observed on this road.",
    icon: <AlertTriangle className="w-4 h-4 text-cyber-crimson" />,
  },
  footpath_missing: {
    label: "Missing Footpath",
    desc: "No dedicated sidewalk available; pedestrians walk on vehicle lanes.",
    icon: <Footprints className="w-4 h-4 text-cyber-cyan" />,
  },
  isolated_stretch: {
    label: "Isolated Stretch",
    desc: "Low footfall and secluded corridor with few open shops or assistance points.",
    icon: <Info className="w-4 h-4 text-titanium-300" />,
  },
  obstruction: {
    label: "Lane Obstruction",
    desc: "Debris, construction material, or unlit barriers blocking the lane.",
    icon: <AlertTriangle className="w-4 h-4 text-cyber-amber" />,
  },
  other: {
    label: "Physical Road Caution",
    desc: "Observable infrastructure defect reported by a commuter.",
    icon: <Info className="w-4 h-4 text-cyber-emerald" />,
  },
};

export default function HazardDetailSheet({ hazard, onClose, onVerify }: HazardDetailSheetProps) {
  if (!hazard) return null;

  const info = ISSUE_LABELS[hazard.issue] || ISSUE_LABELS.other;

  // Format relative timestamp
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const diffHours = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) return "Just recently";
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 metallic-panel p-5 rounded-2xl border border-white/20 shadow-2xl animate-slide-up text-titanium-200 select-none font-sans">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-obsidian-900 border border-white/10">
            {info.icon}
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">{info.label}</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full metallic-chip text-titanium-400">
              Severity {hazard.severity}/5
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-titanium-400 hover:text-white p-1 rounded-lg hover:bg-obsidian-800"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <div className="py-3 space-y-3 text-xs leading-relaxed">
        <p className="text-titanium-200 bg-obsidian-900/60 p-2.5 rounded-xl border border-white/5">
          {hazard.summary || info.desc}
        </p>

        {/* Plain language metadata grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-obsidian-900/40 border border-white/5">
            <span className="text-titanium-500 block text-[10px] uppercase font-mono">When Reported</span>
            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-cyber-cyan" />
              {formatTime(hazard.timestamp)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-obsidian-900/40 border border-white/5">
            <span className="text-titanium-500 block text-[10px] uppercase font-mono">Verifications</span>
            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-cyber-emerald" />
              {hazard.verifiedCount || 1} confirmed
            </span>
          </div>

          <div className="p-2 rounded-lg bg-obsidian-900/40 border border-white/5 col-span-2">
            <span className="text-titanium-500 block text-[10px] uppercase font-mono">Source & Privacy</span>
            <span className="text-titanium-300 flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-cyber-emerald shrink-0" />
              <span>
                {hazard.presenceVerified
                  ? "Physically verified on-site by community commuter"
                  : "Community report (coordinates fuzzed for privacy)"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
        <div>
          {onInspect3D && (
            <button
              onClick={() => onInspect3D(hazard)}
              className="px-3 py-1.5 text-xs text-cyber-cyan border border-cyber-cyan/30 rounded-xl hover:bg-cyber-cyan/10 transition-colors flex items-center gap-1.5 font-medium"
              title="Inspect physical roadway anomaly in 3D wireframe mesh"
            >
              <span>3D Mesh</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-titanium-300 hover:text-white rounded-xl hover:bg-obsidian-800 transition-colors"
          >
            Dismiss
          </button>
          {onVerify && (
            <button
              onClick={() => onVerify(hazard)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-obsidian-950 hover:brightness-110 shadow-sm transition-all flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Confirm Status</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
