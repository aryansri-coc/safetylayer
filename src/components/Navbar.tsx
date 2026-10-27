"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bike,
  Building2,
  Cpu,
  Info,
  Menu,
  MoreVertical,
  Plus,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

interface NavbarProps {
  onOpenReport: () => void;
  onOpenScout: () => void;
  onOpenDemo: () => void;
  onOpenCivic: () => void;
  onOpenPrivacy: () => void;
  onOpenDevInfo: () => void;
  isDemoActive?: boolean;
}

export default function Navbar({
  onOpenReport,
  onOpenScout,
  onOpenDemo,
  onOpenCivic,
  onOpenPrivacy,
  onOpenDevInfo,
  isDemoActive,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <header className="w-full metallic-panel border-b border-white/10 px-4 py-2.5 flex items-center justify-between z-40 shrink-0 select-none font-sans">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white to-titanium-400 p-[1px] shadow-lg shadow-black/40 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[11px] bg-obsidian-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                SafeLayer
              </span>
            </div>
            <p className="text-[11px] text-titanium-400 hidden sm:block">
              Safety-aware route guidance
            </p>
          </div>
        </Link>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Demo CTA for Hackathon Judges */}
        <button
          onClick={onOpenDemo}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold ${
            isDemoActive
              ? "bg-white text-obsidian-950 shadow-md shadow-white/10"
              : "metallic-panel-interactive text-titanium-200 hover:text-white"
          }`}
          title="Interactive 3-minute hackathon walkthrough"
        >
          <Sparkles className="w-4 h-4 text-cyber-emerald" />
          <span>Start demo</span>
        </button>

        {/* Primary CTA: Report an issue (Prominent, min 44px tap target) */}
        <button
          onClick={onOpenReport}
          className="min-h-[44px] px-4 py-2 rounded-xl font-bold bg-white text-obsidian-950 flex items-center gap-2 shadow-lg shadow-white/10 hover:brightness-110 active:scale-95 transition-all text-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Report an issue</span>
        </button>

        {/* More Menu Dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl metallic-panel-interactive text-titanium-300 hover:text-white flex items-center justify-center"
            title="More tools and options"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 metallic-panel rounded-2xl border border-white/15 shadow-2xl p-2 z-50 animate-fade-in text-titanium-200 divide-y divide-white/5 backdrop-blur-2xl">
              {/* Secondary Tools */}
              <div className="py-1 space-y-1">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDemo();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-medium text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-cyber-emerald shrink-0" />
                  <span>3-Minute Demo Walkthrough</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenScout();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Bike className="w-4 h-4 text-cyber-cyan shrink-0" />
                  <span>Community Scout HUD</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCivic();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-titanium-300 shrink-0" />
                  <span>Auto-Drafted Civic Notice</span>
                </button>
              </div>

              {/* Research & Benchmarks */}
              <div className="py-1 space-y-1">
                <Link
                  href="/eval"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors block"
                >
                  <BarChart3 className="w-4 h-4 text-cyber-amber shrink-0 inline-block mr-2.5" />
                  <span>Empirical Evaluation (/eval)</span>
                </Link>

                <Link
                  href="/sim"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors block"
                >
                  <Activity className="w-4 h-4 text-cyber-cyan shrink-0 inline-block mr-2.5" />
                  <span>Monte Carlo Simulation (/sim)</span>
                </Link>
              </div>

              {/* Transparency & About */}
              <div className="py-1 space-y-1">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenPrivacy();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Shield className="w-4 h-4 text-cyber-emerald shrink-0" />
                  <span>Privacy & Ethics Framework</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDevInfo();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                >
                  <Info className="w-4 h-4 text-cyber-cyan shrink-0" />
                  <span>About / Developer Info</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
