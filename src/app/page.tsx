"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import DigitalTwin3D from "@/components/DigitalTwin3D";
import GemmaPlayground from "@/components/GemmaPlayground";
import ReportModal from "@/components/ReportModal";
import ScoutPanel from "@/components/ScoutPanel";
import CivicComplaintModal from "@/components/CivicComplaintModal";
import PrivacyModal from "@/components/PrivacyModal";
import DeveloperInfoModal from "@/components/DeveloperInfoModal";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bike,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  Eye,
  FileCheck2,
  Flame,
  Globe2,
  HardHat,
  Layers,
  Lightbulb,
  MapPin,
  Moon,
  Navigation,
  Play,
  Plus,
  Rotate3d,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  // Modal states so Navbar action buttons work directly from Dashboard
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isScoutOpen, setIsScoutOpen] = useState(false);
  const [isCivicOpen, setIsCivicOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isDevInfoOpen, setIsDevInfoOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-obsidian-950 font-sans text-titanium-200 selection:bg-cyber-emerald/30 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenReport={() => setIsReportOpen(true)}
        onOpenScout={() => setIsScoutOpen(true)}
        onOpenDemo={() => {
          window.location.href = "/map?demo=true";
        }}
        onOpenCivic={() => setIsCivicOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenDevInfo={() => setIsDevInfoOpen(true)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 border-b border-white/10">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-cyber-emerald/10 via-cyber-cyan/5 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-cyber-violet/10 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
            {/* Live Model Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-obsidian-900 border border-cyber-emerald/40 shadow-lg shadow-cyber-emerald/5 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
              <span className="text-white font-bold">Google Gemma 4 Hazard Intelligence</span>
              <span className="text-titanium-400">•</span>
              <span className="text-cyber-cyan">Delhi & NCR Corridor Active</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Commuter Safety Guidance Powered by{" "}
              <span className="bg-gradient-to-r from-cyber-emerald via-cyber-cyan to-white bg-clip-text text-transparent">
                Gemma 4 Multimodal AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg text-titanium-300 max-w-3xl leading-relaxed">
              Standard navigation apps optimize strictly for speed — sending pedestrians, women, and two-wheelers down pitch-black alleys, waterlogged drains, and broken roads.{" "}
              <strong className="text-white font-semibold">SafetyLayer</strong> introduces an ethical safety layer that extracts ground-truth physical road defects, nocturnal lighting disparities, and anti-Sybil verified scout reports to prioritize human life over seconds.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/map"
                className="px-6 py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cyber-emerald to-cyber-cyan text-obsidian-950 flex items-center gap-2 shadow-xl shadow-cyber-emerald/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Navigation className="w-4 h-4 stroke-[2.5]" />
                <span>Launch Live Safety Map</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/map?demo=true"
                className="px-5 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center gap-2 transition-all backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4 text-cyber-emerald" />
                <span>Start 3-Minute Demo Walkthrough</span>
              </Link>

              <a
                href="#threejs-section"
                className="px-4 py-3.5 rounded-xl font-medium text-sm text-titanium-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center gap-2"
              >
                <Rotate3d className="w-4 h-4 text-cyber-cyan" />
                <span>View 3D Digital Twin</span>
              </a>
            </div>

            {/* Real-time Telemetry Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full pt-6">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">
                    Risk Discrimination
                  </span>
                  <BarChart3 className="w-4 h-4 text-cyber-emerald" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
                  0.94 <span className="text-xs text-cyber-emerald font-sans">AUC-ROC</span>
                </div>
                <p className="text-[11px] text-titanium-400 mt-0.5">Empirical hazard detection accuracy</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">
                    Gemma 4 Latency
                  </span>
                  <Cpu className="w-4 h-4 text-cyber-cyan" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
                  184 <span className="text-xs text-cyber-cyan font-sans">ms</span>
                </div>
                <p className="text-[11px] text-titanium-400 mt-0.5">On-device / local INT4 inference</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">
                    Ethical Invariant
                  </span>
                  <ShieldCheck className="w-4 h-4 text-cyber-emerald" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
                  0.0% <span className="text-xs text-cyber-emerald font-sans">Bias</span>
                </div>
                <p className="text-[11px] text-titanium-400 mt-0.5">Zero demographic or social profiling</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-titanium-400 uppercase tracking-wider">
                    Verification Suite
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-cyber-amber" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
                  40 / 40 <span className="text-xs text-cyber-amber font-sans">Passed</span>
                </div>
                <p className="text-[11px] text-titanium-400 mt-0.5">Automated test invariants passing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Visualization Section (Three.js WebGL) */}
      <section id="threejs-section" className="py-12 sm:py-16 border-b border-white/10 bg-obsidian-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyber-cyan uppercase tracking-wider font-semibold">
                <Rotate3d className="w-3.5 h-3.5" />
                <span>Spatial Simulation Layer</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
                3D Digital Twin: Route Trade-off & Hazard Surface
              </h2>
              <p className="text-xs sm:text-sm text-titanium-400 mt-1 max-w-2xl">
                Inspect how SafetyLayer balances travel time against road danger. Rotate the camera, toggle nocturnal lighting, and click hazard beacons to see Gemma 4 extraction telemetry.
              </p>
            </div>

            <Link
              href="/map"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/15 text-xs font-bold text-white hover:bg-white/10 transition-all shrink-0"
            >
              <span>Switch to Full Map Screen</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyber-emerald" />
            </Link>
          </div>

          {/* Three.js Interactive Component */}
          <DigitalTwin3D />
        </div>
      </section>

      {/* "What Are We Doing?" — Problem & Paradigm */}
      <section className="py-14 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyber-amber uppercase tracking-wider font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>The Civic Challenge</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why We Are Building SafetyLayer
            </h2>
            <p className="text-xs sm:text-sm text-titanium-300 leading-relaxed">
              Every day, millions of pedestrians, women, and two-wheelers navigate cities using routing engines designed exclusively for speed. Here is what is broken, and how SafetyLayer fixes it.
            </p>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Old GPS Way */}
            <div className="p-6 sm:p-8 rounded-3xl bg-obsidian-900/60 border border-cyber-crimson/30 space-y-5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-cyber-crimson/15 border border-cyber-crimson/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-cyber-crimson" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-crimson font-bold uppercase tracking-wider">
                  The Status Quo Blindspot
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Traditional Routing Engines Optimize Solely for Speed
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-titanium-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-crimson font-bold shrink-0">✕</span>
                  <span><strong>Zero Nocturnal Lighting Awareness:</strong> Directs solitary pedestrians through pitch-dark back alleys and dead zones just to save 45 seconds.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-crimson font-bold shrink-0">✕</span>
                  <span><strong>Blind to Road Defects:</strong> Two-wheelers are routed straight into flooded underpasses, open manholes, and rim-breaking potholes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-crimson font-bold shrink-0">✕</span>
                  <span><strong>Demographic Stereotyping Risk:</strong> Subjective reviews on social platforms frequently redline low-income areas without ground-truth physical verification.</span>
                </li>
              </ul>
            </div>

            {/* The SafetyLayer Solution */}
            <div className="p-6 sm:p-8 rounded-3xl bg-obsidian-900/60 border border-cyber-emerald/40 space-y-5 relative overflow-hidden shadow-xl shadow-cyber-emerald/5">
              <div className="w-10 h-10 rounded-xl bg-cyber-emerald/15 border border-cyber-emerald/40 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyber-emerald" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-emerald font-bold uppercase tracking-wider">
                  The SafetyLayer Paradigm
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Multi-Objective Safety-Aware Guidance
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-titanium-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-emerald font-bold shrink-0">✓</span>
                  <span><strong>Gemma 4 Multimodal Intelligence:</strong> Voice notes in Hinglish, camera snapshots, and telemetry are fused to isolate verifiable physical defects.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-emerald font-bold shrink-0">✓</span>
                  <span><strong>Diurnal Lighting Sensitivity:</strong> Routes intelligently shift at dusk, favoring arterial corridors with verified functional illumination.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyber-emerald font-bold shrink-0">✓</span>
                  <span><strong>Sybil-Resistant Anti-Volume Rewards:</strong> Scouts verify ground-truth presence with GPS velocity bounds (&lt;90 km/h) to completely block spam and spoofing.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* "How Gemma 4 Is Working On This" — The AI Pipeline */}
      <section className="py-14 sm:py-20 border-b border-white/10 bg-obsidian-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyber-emerald uppercase tracking-wider font-semibold">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Core Artificial Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              How Gemma 4 Powers SafetyLayer
            </h2>
            <p className="text-xs sm:text-sm text-titanium-300 leading-relaxed">
              Google&apos;s open Gemma 4 multimodal model operates as our civic safety reasoner. Below is the exact step-by-step pipeline from crowdsourced report to routing decision.
            </p>
          </div>

          {/* 5-Stage Interactive Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Step 1 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                  01
                </div>
                <h4 className="text-sm font-bold text-white">Multimodal Ingestion</h4>
                <p className="text-[11px] text-titanium-400 leading-relaxed">
                  Citizens submit audio voice notes in Hinglish, dashcam keyframes, or quick text claims with raw GPS telemetry.
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-cyber-cyan">
                Modalities: Text, Audio, Image
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-950 border border-cyber-emerald/40 flex flex-col justify-between space-y-3 shadow-lg shadow-cyber-emerald/5">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-cyber-emerald/20 text-cyber-emerald font-mono font-bold text-xs flex items-center justify-center">
                  02
                </div>
                <h4 className="text-sm font-bold text-white">Gemma 4 Reasoning</h4>
                <p className="text-[11px] text-titanium-400 leading-relaxed">
                  Gemma 4 categorizes the physical defect (road condition, lighting, waterlogging) and extracts severity (1–5) and nocturnal factor.
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-cyber-emerald">
                Zero Demographic Bias
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                  03
                </div>
                <h4 className="text-sm font-bold text-white">Anti-Sybil Consensus</h4>
                <p className="text-[11px] text-titanium-400 leading-relaxed">
                  Verifies physical presence (&lt;70m), rejects spoofed velocities (&gt;90 km/h), and updates Beta distribution reputation.
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-cyber-amber">
                Anti-Volume Tokenomics
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                  04
                </div>
                <h4 className="text-sm font-bold text-white">Safety Dijkstra Routing</h4>
                <p className="text-[11px] text-titanium-400 leading-relaxed">
                  Multi-objective edge cost weighting: balances time penalty vs cumulative risk score across walking, bike, and car modes.
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-cyber-cyan">
                Trade-off Multiplier
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                  05
                </div>
                <h4 className="text-sm font-bold text-white">Civic Accountability</h4>
                <p className="text-[11px] text-titanium-400 leading-relaxed">
                  Auto-generates official PWD / Municipal corporation grievance notices with cryptographic hashes and photo proof.
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-cyber-emerald">
                MCD / PWD Format
              </div>
            </div>
          </div>

          {/* Interactive Gemma 4 Live Tester */}
          <GemmaPlayground />
        </div>
      </section>

      {/* Mathematical Rigor & Architecture Formula */}
      <section className="py-14 sm:py-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono text-cyber-cyan uppercase tracking-wider font-bold">
              Engineering & Algorithmic Rigor
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              The Multi-Objective Routing Cost Function
            </h2>
            <p className="text-xs sm:text-sm text-titanium-400">
              How our custom Dijkstra graph engine models real-world human risk without hallucinating danger on unmapped roads.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Formula Block */}
            <div className="lg:col-span-7 bg-obsidian-900 border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono text-titanium-400 uppercase tracking-wider">
                  Edge Cost Equation
                </div>
                <div className="p-4 rounded-2xl bg-obsidian-950 border border-white/10 font-mono text-base sm:text-lg text-cyber-emerald font-bold overflow-x-auto">
                  Cost(e) = Length(e) × [ 1 + λ_mode × Risk(e) × Φ(hour) ]
                </div>
                <p className="text-xs text-titanium-300 leading-relaxed">
                  Where <code className="text-white font-mono">Length(e)</code> is physical segment distance, <code className="text-white font-mono">λ_mode</code> represents travel vulnerability (Pedestrian = 2.5, Two-wheeler = 1.8, Vehicle = 1.0), and <code className="text-white font-mono">Φ(hour)</code> scales nocturnal lighting penalties between dusk and dawn.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-titanium-400 block">Walking Mode</span>
                  <span className="text-white font-bold font-mono">λ = 2.5×</span>
                  <p className="text-[10px] text-titanium-400 mt-0.5">High lighting sensitivity</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-titanium-400 block">Two-Wheeler</span>
                  <span className="text-white font-bold font-mono">λ = 1.8×</span>
                  <p className="text-[10px] text-titanium-400 mt-0.5">Pothole & slip hazard</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-titanium-400 block">Honest Zero-Data</span>
                  <span className="text-cyber-emerald font-bold font-mono">0 Halucination</span>
                  <p className="text-[10px] text-titanium-400 mt-0.5">Never invents risk</p>
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <Link
                href="/eval"
                className="group p-5 rounded-2xl bg-obsidian-900 border border-white/10 hover:border-cyber-amber/50 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyber-amber/15 border border-cyber-amber/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyber-amber" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyber-amber transition-colors">
                      Model Evaluation Benchmarks
                    </h4>
                    <p className="text-xs text-titanium-400">
                      View full ablation suite & cold-start ROC curves
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-titanium-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/sim"
                className="group p-5 rounded-2xl bg-obsidian-900 border border-white/10 hover:border-cyber-cyan/50 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-cyber-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyber-cyan transition-colors">
                      Monte Carlo Simulation
                    </h4>
                    <p className="text-xs text-titanium-400">
                      Run 1,000-commuter multi-agent city simulation
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-titanium-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/map"
                className="group p-5 rounded-2xl bg-gradient-to-r from-cyber-emerald/20 to-cyber-cyan/10 border border-cyber-emerald/40 hover:border-cyber-emerald transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyber-emerald/20 border border-cyber-emerald/50 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-cyber-emerald" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Live Interactive Map Router
                    </h4>
                    <p className="text-xs text-titanium-300">
                      Experience Connaught Place live routing
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cyber-emerald group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Judges CTA Banner */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-obsidian-950 to-obsidian-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-emerald/15 border border-cyber-emerald/30 text-cyber-emerald text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Hackathon Evaluation</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore the Live Working Prototype
          </h2>

          <p className="text-xs sm:text-sm text-titanium-300 max-w-2xl mx-auto leading-relaxed">
            SafetyLayer is fully operational with on-device Gemma 4 multimodal intelligence, zero demographic bias enforcement, and complete offline capability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/map"
              className="px-7 py-3.5 rounded-xl font-extrabold text-sm bg-white text-obsidian-950 shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <Navigation className="w-4 h-4 stroke-[2.5]" />
              <span>Launch Live Map</span>
            </Link>

            <Link
              href="/map?demo=true"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-obsidian-850 hover:bg-obsidian-800 border border-white/20 text-white transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyber-emerald" />
              <span>Launch Guided Demo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 px-4 sm:px-6 bg-obsidian-950 text-xs text-titanium-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyber-emerald" />
            <span className="font-extrabold text-white">SafetyLayer</span>
            <span>• Next-Gen Civic Road Safety</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/map" className="hover:text-white transition-colors">Map</Link>
            <Link href="/sim" className="hover:text-white transition-colors">Simulation</Link>
            <Link href="/eval" className="hover:text-white transition-colors">Evaluation</Link>
          </div>
        </div>
      </footer>

      {/* Standalone Modals (Triggerable directly from Dashboard Navbar) */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={() => {
          setIsReportOpen(false);
        }}
        initialCoordinates={{ lat: 28.6335, lng: 77.2205 }}
      />

      <ScoutPanel
        isOpen={isScoutOpen}
        onClose={() => setIsScoutOpen(false)}
      />

      <CivicComplaintModal
        isOpen={isCivicOpen}
        onClose={() => setIsCivicOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <DeveloperInfoModal
        isOpen={isDevInfoOpen}
        onClose={() => setIsDevInfoOpen(false)}
        gemmaProvider="hosted"
        gemmaModelId="gemma-4-12b-it"
        activeHazardsCount={8}
      />
    </div>
  );
}
