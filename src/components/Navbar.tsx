"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bike,
  Building2,
  Compass,
  Cpu,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreVertical,
  Navigation,
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
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click or Escape key, trap focus
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="w-full bg-obsidian-950 border-b border-white/10 px-3.5 sm:px-6 py-2.5 flex items-center justify-between z-40 shrink-0 select-none font-sans">
      {/* Brand (B1: SafetyLayer) */}
      <div className="flex items-center gap-4 lg:gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white to-titanium-400 p-[1px] shadow-lg shadow-black/40 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[11px] bg-obsidian-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                SafetyLayer
              </span>
            </div>
            <p className="text-[11px] text-titanium-300 hidden sm:block">
              Safety-aware route guidance
            </p>
          </div>
        </Link>

        {/* Center Nav Links for desktop */}
        <nav className="hidden md:flex items-center gap-1 bg-obsidian-900/90 border border-white/10 p-1 rounded-xl">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              pathname === "/"
                ? "bg-white/15 text-white font-bold shadow-sm"
                : "text-titanium-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/map"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              pathname === "/map"
                ? "bg-white/15 text-white font-bold shadow-sm"
                : "text-titanium-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyber-emerald" />
            <span>Live Map</span>
          </Link>

          <Link
            href="/sim"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              pathname === "/sim"
                ? "bg-white/15 text-white font-bold shadow-sm"
                : "text-titanium-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Simulation</span>
          </Link>

          <Link
            href="/eval"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              pathname === "/eval"
                ? "bg-white/15 text-white font-bold shadow-sm"
                : "text-titanium-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyber-amber" />
            <span>Evaluation</span>
          </Link>
        </nav>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Demo CTA for Judges */}
        <button
          onClick={onOpenDemo}
          className={`min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold ${
            isDemoActive
              ? "bg-white text-obsidian-950 shadow-md shadow-white/10"
              : "bg-obsidian-900 border border-white/10 text-titanium-200 hover:text-white hover:bg-obsidian-800"
          }`}
          title="Start interactive 3-minute demo"
          aria-label="Start interactive 3-minute demo"
        >
          <Sparkles className="w-4 h-4 text-cyber-emerald" />
          <span>Start demo</span>
        </button>

        {/* Primary CTA: Report an issue (Prominent, min 44px tap target) */}
        <button
          id="report-hazard-button"
          onClick={onOpenReport}
          className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl font-bold bg-white text-obsidian-950 flex items-center gap-2 shadow-lg shadow-white/10 hover:brightness-110 active:scale-95 transition-all text-xs"
          title="Report a hazard or road defect"
          aria-label="Report a hazard or road defect"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Report an issue</span>
        </button>

        {/* More Menu Anchor */}
        <div ref={menuRef} className="relative">
          <button
            id="more-menu-button"
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-800 border border-white/10 text-titanium-200 hover:text-white flex items-center justify-center transition-colors"
            title="More options and transparency tools"
            aria-label="More options and transparency tools"
            aria-expanded={isMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Dropdown Menu / Mobile Bottom Sheet (B2, B3, C1) */}
          {isMenuOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 md:hidden animate-fade-in"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Menu Container: Opaque solid background, constrained to viewport, zero see-through */}
              <div
                className={`
                  z-50 bg-obsidian-950 border border-white/20 shadow-2xl animate-fade-in text-titanium-200 divide-y divide-white/10
                  fixed md:absolute bottom-0 md:bottom-auto md:top-full md:right-0 md:mt-2
                  left-0 right-0 md:left-auto md:w-72 max-w-[calc(100vw-16px)] md:max-w-none
                  rounded-t-3xl md:rounded-2xl p-3 md:p-2.5 overflow-hidden
                `}
                role="dialog"
                aria-modal="true"
                aria-label="Application tools and transparency options"
              >
                {/* Mobile Drag Indicator & Header */}
                <div className="md:hidden flex items-center justify-between pb-2 mb-1 border-b border-white/10">
                  <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Options & Tools
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="min-h-[36px] min-w-[36px] p-1 text-titanium-400 hover:text-white flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <div className="py-1.5 space-y-1 md:hidden">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-titanium-400 font-semibold">
                    Navigation
                  </div>
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <LayoutDashboard className="w-4 h-4 text-cyber-cyan" />
                    </span>
                    <span>Safety Overview Dashboard</span>
                  </Link>
                  <Link
                    href="/map"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4 text-cyber-emerald" />
                    </span>
                    <span>Live Interactive Map</span>
                  </Link>
                </div>

                {/* Group 1: Tools (B3 & C1) */}
                <div className="py-1.5 space-y-1">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-titanium-400 font-semibold">
                    Tools
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDemo();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-cyber-emerald" />
                    </span>
                    <span>Demo walkthrough</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenScout();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4 text-cyber-cyan" />
                    </span>
                    <span>Scout mode</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCivic();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-titanium-300" />
                    </span>
                    <span>Civic notice</span>
                  </button>
                </div>

                {/* Group 2: For judges and developers (B3 & C1) */}
                <div className="py-1.5 space-y-1">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-titanium-400 font-semibold">
                    For judges and developers
                  </div>

                  <Link
                    href="/eval"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 text-cyber-amber" />
                    </span>
                    <span>Test results</span>
                  </Link>

                  <Link
                    href="/sim"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-cyber-cyan" />
                    </span>
                    <span>Simulation results</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenPrivacy();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-cyber-emerald" />
                    </span>
                    <span>Privacy and ethics</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDevInfo();
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs text-titanium-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-cyber-cyan" />
                    </span>
                    <span>About and developer info</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
