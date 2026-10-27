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
    <div className="fixed bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-40 metallic-panel p-5 rounded-2xl border border-white/20 shadow-2xl animate-slide-up text-titanium-200 select-none font-sans">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 text-white border border-white/15">
            <ShieldCheck className="w-4 h-4 text-cyber-emerald" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Welcome to SafeLayer</h3>
            <p className="text-[11px] text-titanium-400">Safer navigation powered by community reports</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-titanium-400 hover:text-white p-1 rounded-lg hover:bg-obsidian-800"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3 Short Steps (Understood in 5 seconds!) */}
      <div className="py-3.5 space-y-2.5 text-xs">
        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
            1
          </span>
          <div>
            <span className="font-semibold text-white">Search your destination:</span>
            <span className="text-titanium-400 ml-1">Type any place in the search bar or pick on the map.</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
            2
          </span>
          <div>
            <span className="font-semibold text-white">Compare routes:</span>
            <span className="text-titanium-400 ml-1">See which route has fewer reported issues (lighting, potholes, etc.).</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cyber-amber/15 text-cyber-amber border border-cyber-amber/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
            3
          </span>
          <div>
            <span className="font-semibold text-white">Report a problem:</span>
            <span className="text-titanium-400 ml-1">One tap to log hazards and make streets safer for everyone.</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
        <button
          onClick={onStartDemo}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-b from-white to-titanium-200 text-obsidian-950 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-white/10"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Try the demo</span>
        </button>

        <button
          onClick={onClose}
          className="px-3.5 py-2 text-xs text-titanium-300 hover:text-white rounded-xl hover:bg-obsidian-800 transition-colors"
        >
          Got it, let's explore
        </button>
      </div>
    </div>
  );
}
