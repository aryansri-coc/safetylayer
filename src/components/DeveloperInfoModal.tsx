"use client";

import React from "react";
import { Cpu, Database, Eye, Info, Map, Shield, Sparkles, X } from "lucide-react";

interface DeveloperInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gemmaProvider?: string;
  gemmaModelId?: string;
  activeHazardsCount?: number;
}

export default function DeveloperInfoModal({
  isOpen,
  onClose,
  gemmaProvider = "hosted",
  gemmaModelId = "gemma-4-12b-it",
  activeHazardsCount = 4,
}: DeveloperInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg metallic-panel p-6 rounded-2xl border border-white/15 shadow-2xl text-titanium-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">About & Developer Transparency</h3>
              <p className="text-[11px] text-titanium-400">System architecture and provider audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-titanium-400 hover:text-white hover:bg-obsidian-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Specs & Honesty Rules */}
        <div className="py-4 space-y-3.5 text-xs">
          {/* AI Inference Specs */}
          <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-white">
              <Cpu className="w-3.5 h-3.5 text-cyber-cyan" />
              <span className="font-bold">Multimodal AI Extraction Model</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-titanium-300 font-mono text-[11px] pt-1">
              <div>
                Provider: <span className="text-white capitalize">{gemmaProvider}</span>
              </div>
              <div>
                Model ID: <span className="text-white">{gemmaModelId}</span>
              </div>
            </div>
            <p className="text-[11px] text-titanium-400 pt-1">
              Structured extraction from Hinglish/English voice notes and optional keyframes. Strictly constrained to observable physical defects (lighting, road condition, footpaths).
            </p>
          </div>

          {/* Map Engine & Basemap */}
          <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-white">
              <Map className="w-3.5 h-3.5 text-cyber-emerald" />
              <span className="font-bold">Mapping & Routing Engines</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-titanium-300 font-mono text-[11px] pt-1">
              <div>
                Engine: <span className="text-white">MapLibre GL</span>
              </div>
              <div>
                Routing: <span className="text-white">OSRM + Google (optional)</span>
              </div>
              <div>
                Geocoding: <span className="text-white">Photon / OpenStreetMap</span>
              </div>
              <div>
                Style: <span className="text-white">Carto Dark Matter</span>
              </div>
            </div>
          </div>

          {/* Data Honesty Declarations */}
          <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-white">
              <Database className="w-3.5 h-3.5 text-cyber-amber" />
              <span className="font-bold">Data Honesty Declaration</span>
            </div>
            <ul className="space-y-1 text-titanium-300 text-[11px] list-disc list-inside">
              <li>
                <strong className="text-white">Central Delhi Corridor:</strong> Seeded demo baseline data (labeled "Demo data").
              </li>
              <li>
                <strong className="text-white">Unmapped Roads:</strong> Stretches without community reports honestly display "No data yet" with grey styling. Risk is never fabricated for unseen roads.
              </li>
              <li>
                <strong className="text-white">Active Hazards:</strong> {activeHazardsCount} published physical road reports in database.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-obsidian-950 hover:brightness-110 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
