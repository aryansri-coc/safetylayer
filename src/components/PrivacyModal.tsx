"use client";

import React from "react";
import { CheckCircle2, Lock, Shield, ShieldAlert, Sparkles, X } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel-elevated p-6 rounded-2xl border border-slate-700 shadow-2xl text-slate-100 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Privacy & Ethical AI Architecture</h3>
              <p className="text-xs text-slate-400">Built-in safeguards against demographic profiling & data retention</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guarantees List */}
        <div className="space-y-3.5 my-4 text-xs">
          {/* Rule 1 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Strict Physical Hazard Taxonomy Only</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-6">
              SafetyLayer strictly forbids labeling neighbourhoods, demographics, caste, religion, or communities. Gemma 4 prompts enforce negative constraints rejecting social profiling. Only observable physical infrastructure (lighting, potholes, footpaths, obstructions) is logged.
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero Raw Video Retention & Client-Side Blur</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-6">
              When video is captured (Tier 2), the browser samples 3-5 keyframes and strips EXIF data. Raw video is processed in ephemeral memory and permanently purged immediately following Gemma extraction. Faces and vehicle registration plates are blurred client-side.
            </p>
          </div>

          {/* Rule 3 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Location Fuzzing & Scout Privacy Zones</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-6">
              Exact reporter coordinates are perturbed (&plusmn;25m) before public aggregation. For Scout riders, 500m Home/Start/End blackout zones prevent recording near residential origins.
            </p>
          </div>

          {/* Rule 4 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Algorithmic Fairness Audit</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-6">
              SafetyLayer compares baseline risk calculations against commercial vibrancy indicators to prevent disproportionate penalization of lower-income market corridors that have active night street vendors and strong pedestrian guardian presence despite lacking decorative lighting.
            </p>
          </div>
        </div>

        {/* Device Tier Transparency Box */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <strong className="text-slate-200 block mb-1">Device Tier Transparency Statement:</strong>
          "Nothing leaves your phone" is true exclusively for our On-Device Edge tier (Gemma 4 E2B/E4B). For compressed uploads, minimal audio/keyframe snippets are transmitted via TLS and permanently deleted post-inference.
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
