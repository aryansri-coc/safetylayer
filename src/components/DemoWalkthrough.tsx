"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Play, ShieldAlert, Sparkles, X } from "lucide-react";

interface DemoWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReport: (simulateSpoof?: boolean) => void;
  onToggleSaferRoute: () => void;
  onOpenCivicComplaint: () => void;
  onOpenPrivacySlide: () => void;
}

export default function DemoWalkthrough({
  isOpen,
  onClose,
  onTriggerReport,
  onToggleSaferRoute,
  onOpenCivicComplaint,
  onOpenPrivacySlide,
}: DemoWalkthroughProps) {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "1. COLD-START STREET VIEW PRIOR",
      desc: "Observe road segments before any reports exist. Daylight Street View detects lamp fixtures, but honestly labels them 'working status unknown' with a weak 0.25 prior weight.",
      actionLabel: "INSPECT BASELINE",
      action: () => {},
    },
    {
      step: 2,
      title: "2. MULTIMODAL HINGLISH EXTRACTION",
      desc: "Commuter reports: 'Batti nahi jal rahi hai scindia house ke paas, bohot andhera hai'. Gemma 4 extracts structured JSON, detects issue category, time relevance, and physical elements.",
      actionLabel: "TRIGGER REPORT",
      action: () => onTriggerReport(false),
    },
    {
      step: 3,
      title: "3. TRUST DEFENSE (SPOOF INTERCEPTION)",
      desc: "A remote bot submits a fake hazard 45 km away. Module C checks the GPS transit trail and velocity, immediately intercepting and rejecting the spoofed report.",
      actionLabel: "TEST SPOOF REJECT",
      action: () => onTriggerReport(true),
    },
    {
      step: 4,
      title: "4. SAFETY-AWARE ROUTE TRADEOFF",
      desc: "Module E compares the direct route (14 min through dark unlit service road) vs the recommended commercial corridor (17 min via Janpath), showcasing a transparent '+3 min, 25% fewer issues' trade-off.",
      actionLabel: "COMPARE TRADEOFF",
      action: () => onToggleSaferRoute(),
    },
    {
      step: 5,
      title: "5. CIVIC ESCALATION & ZERO RETENTION",
      desc: "SafeLayer aggregates verified reports into an auto-drafted formal municipal notice (NDMC) while strictly discarding raw video and fuzzing reporter coordinates.",
      actionLabel: "VIEW CIVIC DRAFT",
      action: () => onOpenCivicComplaint(),
    },
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-md w-full metallic-panel p-5 rounded-2xl border border-white/15 shadow-2xl text-titanium-200 animate-slide-up select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse"></span>
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-white">
            DEMO SEQUENCE • HACKATHON WALKTHROUGH
          </h4>
        </div>
        <button onClick={onClose} className="text-titanium-500 hover:text-white text-xs">
          ✕
        </button>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-1.5 my-3">
        {steps.map((s) => (
          <div
            key={s.step}
            onClick={() => setStep(s.step)}
            className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
              step >= s.step ? "bg-white shadow-sm" : "bg-obsidian-800"
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-1.5 mb-4">
        <h5 className="font-mono font-bold text-xs text-white uppercase tracking-wider">
          {current.title}
        </h5>
        <p className="text-xs text-titanium-400 leading-relaxed font-sans">{current.desc}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono">
        <button
          onClick={() => {
            current.action();
          }}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-b from-white to-titanium-200 text-obsidian-950 flex items-center gap-1.5 shadow-md shadow-white/10 hover:brightness-110 active:scale-95 transition-all"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{current.actionLabel}</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-titanium-400 hover:text-white px-2 py-1 rounded metallic-chip"
            >
              PREV
            </button>
          )}
          {step < steps.length ? (
            <button
              onClick={() => setStep(step + 1)}
              className="text-white hover:text-white px-3 py-1 rounded metallic-chip flex items-center gap-1 border border-white/15"
            >
              NEXT <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-cyber-emerald font-bold px-3 py-1 rounded metallic-badge-emerald"
            >
              DONE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
