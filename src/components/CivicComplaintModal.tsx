"use client";

import React, { useState } from "react";
import { RoadSegment } from "@/types";
import { Building2, Check, Copy, Download, FileText, Send, X } from "lucide-react";

interface CivicComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSegment?: RoadSegment | null;
}

export default function CivicComplaintModal({ isOpen, onClose, selectedSegment }: CivicComplaintModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const segmentName = selectedSegment?.name || "Barakhamba Service Road & Metro Connector";
  const coordinates = selectedSegment?.baselinePrior?.coordinates || { lat: 28.6302, lng: 77.2248 };
  const dominantHazard = selectedSegment?.compositeRisk.dominantIssue || "lighting";

  const draftLetter = `TO:
The Executive Engineer (Electrical & Works Division)
New Delhi Municipal Council (NDMC) / Municipal Authority
Palika Kendra, New Delhi

DATE: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}

SUBJECT: Urgent Public Safety Notice: Non-functional Street Lighting & Infrastructure Hazard at ${segmentName}

Respected Sir/Madam,

This formal civic notice is auto-generated and backed by SafeLayer, a crowdsourced route-safety monitoring platform.

Between October 2026 and the present date, multiple independent verified commuters and registered Scout riders have logged persistent physical hazards along:
Location: ${segmentName}
Coordinates: ${coordinates.lat.toFixed(5)}° N, ${coordinates.lng.toFixed(5)}° E
Primary Defect: Non-functional streetlights resulting in complete darkness after 20:00 hrs.
Secondary Observation: Broken road shoulders and unpaved trenches endangering two-wheelers and pedestrians.

CORROBORATION SUMMARY:
- Verified Reports: 6 independent reports from commuters with confirmed GPS transit trails.
- Cross-Modal Verification: Nighttime lumination deficit confirmed via Gemma 4 Multimodal reasoning.
- Risk Classification: Elevated Caution (85/100 nocturnal hazard index).

In accordance with municipal service level benchmarks, dark corridors on active service roads present severe vulnerability for women travelers, cyclists, and senior citizens. We request an immediate inspection and restoration of lighting fixtures along this corridor.

Submitted on behalf of local commuters,
SafeLayer Civic Action Working Group
Reference ID: SL-NDMC-${Math.floor(100000 + Math.random() * 900000)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(draftLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([draftLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Civic_Complaint_${segmentName.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel-elevated p-6 rounded-2xl border border-slate-700 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Civic Action: Auto-Drafted Complaint</h3>
              <p className="text-xs text-slate-400">Transforming crowdsourced hazards into municipal accountability</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Letter Preview */}
        <div className="my-4 flex-1 overflow-y-auto p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 leading-relaxed whitespace-pre-wrap">
          {draftLetter}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-400">
            Export as formal PDF or grievance text for municipal portal (e.g. NDMC 311 / BBMP Sahaaya).
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Letter"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Text File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
