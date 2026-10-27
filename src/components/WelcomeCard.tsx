"use client";

import React from "react";
import { AlertCircle, CheckCircle, ChevronRight, Compass, MapPin, Play, Search, ShieldCheck, Sparkles, X } from "lucide-react";

interface WelcomeCardProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export default function WelcomeCard({ isOpen, onClose, onStartDemo }: WelcomeCardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-24 left-4 right-4 md:top-auto md:bottom-8 md:left-6 md:right-auto md:w-[420px] z-40 bg-obsidian-950/98 p-5 rounded-2xl border border-white/25 shadow-2xl animate-fade-in text-titanium-200 select-none font-sans backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 text-white border border-white/20">
            <ShieldCheck className="w-4 h-4 text-cyber-emerald" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Welcome to SafetyLayer</h3>
            <p className="text-[11px] text-titanium-300">Safety-aware navigation powered by community reports</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-titanium-400 hover:text-white p-1.5 rounded-lg hover:bg-obsidian-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Dismiss welcome card"
          aria-label="Dismiss welcome card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Short Steps (Understood in 5 seconds, all 100% supported!) */}
      <div className="py-3.5 space-y-2.5 text-xs">
        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold flex items-center justify-center shrink-0 text-[11px]">
            1
          </span>
          <div>
            <span className="font-semibold text-white">Search your destination:</span>
            <span className="text-titanium-300 ml-1">Type any place in the search bar or pick on the map.</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold flex items-center justify-center shrink-0 text-[11px]">
            2
          </span>
          <div>
            <span className="font-semibold text-white">Compare routes:</span>
            <span className="text-titanium-300 ml-1">See which route has fewer reported issues (lighting, potholes, etc.).</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 font-bold flex items-center justify-center shrink-0 text-[11px]">
            3
          </span>
          <div>
            <span className="font-semibold text-white">Report a problem:</span>
            <span className="text-titanium-300 ml-1">One tap to log hazards and make streets safer for everyone.</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Min 44px tap targets) */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
        <button
          onClick={onStartDemo}
          className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-white text-obsidian-950 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Try the demo</span>
        </button>

        <button
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 text-xs text-titanium-200 hover:text-white rounded-xl hover:bg-obsidian-800 transition-colors"
        >
          Got it, let's explore
        </button>
      </div>
    </div>
  );
}
