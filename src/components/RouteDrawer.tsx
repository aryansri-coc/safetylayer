"use client";

import React, { useState } from "react";
import { RouteAlternative, TravelMode } from "@/types";
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Footprints,
  HelpCircle,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

interface RouteDrawerProps {
  routes: RouteAlternative[];
  selectedRoute: RouteAlternative | null;
  onSelectRoute: (route: RouteAlternative) => void;
  travelMode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
  queryHour: number;
  onChangeHour: (hour: number) => void;
  isLoading?: boolean;
}

const CAUTION_EXPLANATIONS: Record<string, string> = {
  lighting: "Inactive or missing streetlights reported along this stretch.",
  road_condition: "Potholes, broken asphalt, or open work pits reported.",
  footpath_missing: "No separated sidewalk; walking alongside vehicle traffic.",
  isolated_stretch: "Quiet corridor with low footfall and few open stores.",
  obstruction: "Debris, barricades, or material partially blocking the path.",
  other: "Physical road hazard noted by community commuters.",
};

export default function RouteDrawer({
  routes,
  selectedRoute,
  onSelectRoute,
  travelMode,
  onChangeMode,
  queryHour,
  onChangeHour,
  isLoading,
}: RouteDrawerProps) {
  const [isChangingTime, setIsChangingTime] = useState(false);
  const [selectedCaution, setSelectedCaution] = useState<{ id: string; text: string } | null>(null);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  // Travel modes: Walk, Two-wheeler, Vehicle (Plain words & icons)
  const modes: { id: TravelMode; label: string; icon: React.ReactNode }[] = [
    { id: "walking", label: "Walk", icon: <Footprints className="w-4 h-4" /> },
    { id: "two_wheeler", label: "Two-wheeler", icon: <Bike className="w-4 h-4" /> },
    { id: "driving", label: "Vehicle", icon: <Car className="w-4 h-4" /> },
  ];

  const currentHourNow = new Date().getHours();
  const isLeaveNow = queryHour === currentHourNow;

  const formatHour = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:00 ${period}`;
  };

  const isNocturnal = queryHour >= 19 || queryHour < 6;

  return (
    <div className="flex flex-col h-full metallic-panel p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-2xl text-titanium-200 overflow-hidden font-sans select-none">
      {/* Header with Mobile Collapse Toggle */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-bold text-sm tracking-wide text-white">Route options</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-titanium-400">
            {routes.length} {routes.length === 1 ? "route" : "routes"}
          </span>
          <button
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
            className="md:hidden p-1 text-titanium-400 hover:text-white"
            title="Toggle panel"
          >
            {isMobileCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMobileCollapsed && (
        <>
          {/* Travel Mode Selector (Min 44px tap targets) */}
          <div className="grid grid-cols-3 gap-1.5 my-3 p-1 rounded-xl bg-obsidian-900 border border-white/10 shrink-0">
            {modes.map((m) => {
              const isActive = travelMode === m.id || (m.id === "walking" && travelMode === "night_commute");
              return (
                <button
                  key={m.id}
                  onClick={() => onChangeMode(m.id)}
                  className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-obsidian-950 font-bold shadow-md shadow-white/10"
                      : "text-titanium-400 hover:text-white hover:bg-obsidian-800"
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Departure Time Control: Defaults to "Leave now" with optional "Change time" */}
          <div className="mb-3 p-3 rounded-xl bg-obsidian-900/90 border border-white/10 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-titanium-300">
                <Clock className="w-4 h-4 text-cyber-cyan" />
                <span className="font-medium">
                  {isLeaveNow ? "Leave now" : `Depart at ${formatHour(queryHour)}`}
                </span>
                {isNocturnal && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyber-amber/15 text-cyber-amber border border-cyber-amber/30">
                    Night
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsChangingTime(!isChangingTime)}
                className="text-xs text-cyber-cyan hover:underline font-medium min-h-[32px] px-2 flex items-center"
              >
                {isChangingTime ? "Done" : "Change time"}
              </button>
            </div>

            {/* Expandable Departure Time Slider */}
            {isChangingTime && (
              <div className="pt-2 border-t border-white/5 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center text-xs">
                  <button
                    onClick={() => {
                      onChangeHour(new Date().getHours());
                      setIsChangingTime(false);
                    }}
                    className="text-[11px] text-titanium-400 hover:text-white underline"
                  >
                    Reset to Now
                  </button>
                  <span className="font-bold text-white font-mono px-2 py-0.5 rounded metallic-chip">
                    {formatHour(queryHour)}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="23"
                  value={queryHour}
                  onChange={(e) => onChangeHour(parseInt(e.target.value))}
                  className="w-full cursor-pointer h-2 bg-obsidian-700 rounded-lg appearance-none accent-white focus:outline-none"
                />

                <div className="flex justify-between text-[10px] font-mono text-titanium-500">
                  <span>Midnight</span>
                  <span>Noon</span>
                  <span>Night</span>
                </div>
              </div>
            )}
          </div>

          {/* Route Cards Stream */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-titanium-400 flex flex-col items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Finding routes and reported road cautions...</span>
              </div>
            ) : routes.length === 0 ? (
              <div className="p-6 text-center text-xs text-titanium-400 bg-obsidian-900/40 rounded-xl border border-white/5">
                <p>No routes found between these locations.</p>
                <p className="text-[11px] text-titanium-500 mt-1">
                  Try searching a different destination or pick a point on the map.
                </p>
              </div>
            ) : (
              routes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const isRec = route.isRecommended;
                const issuesCount = route.reportedIssuesCount ?? route.hazardsEncountered.length;
                const isNoData = route.dataSource === "no_data_yet" || route.coveragePercentage === 0;

                // Color and Icon indicators (Never rely on color alone!)
                let issueBadgeText = `${issuesCount} reported issue${issuesCount === 1 ? "" : "s"}`;
                let issueBadgeClass = "bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/30";
                let IssueIcon = CheckCircle2;

                if (isNoData) {
                  issueBadgeText = "No data yet";
                  issueBadgeClass = "bg-titanium-500/15 text-titanium-300 border-titanium-500/30";
                  IssueIcon = HelpCircle;
                } else if (issuesCount >= 3) {
                  issueBadgeText = `${issuesCount} reported issues (Many)`;
                  issueBadgeClass = "bg-cyber-crimson/15 text-cyber-crimson border-cyber-crimson/30";
                  IssueIcon = ShieldAlert;
                } else if (issuesCount >= 1) {
                  issueBadgeText = `${issuesCount} reported issue${issuesCount > 1 ? "s" : ""} (Some)`;
                  issueBadgeClass = "bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30";
                  IssueIcon = AlertTriangle;
                } else {
                  issueBadgeText = "Fewer reported issues";
                  issueBadgeClass = "bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/30";
                  IssueIcon = ShieldCheck;
                }

                // Data source badge in plain words
                const dataSourceLabel =
                  route.dataSource === "demo_data"
                    ? "Demo data"
                    : isNoData
                    ? "No data yet"
                    : "Live data";

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute(route)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "metallic-panel border-white/40 shadow-xl bg-obsidian-900/90 ring-1 ring-white/20"
                        : "metallic-panel-interactive border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Header: Route Name & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-sm text-white leading-snug">
                        {route.name}
                      </div>
                      {isRec && (
                        <span className="shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cyber-emerald text-obsidian-950 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          Recommended
                        </span>
                      )}
                    </div>

                    {/* Simple Readout: Time, Distance, Issue Count */}
                    <div className="grid grid-cols-3 gap-2 py-2 my-2 rounded-xl bg-obsidian-950/80 border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-titanium-500 block">
                          Time
                        </span>
                        <span className="text-sm font-bold text-white">{route.durationMinutes} min</span>
                      </div>
                      <div className="border-x border-white/5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-titanium-500 block">
                          Distance
                        </span>
                        <span className="text-sm font-medium text-titanium-300">
                          {route.distanceKm} km
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-titanium-500 block">
                          Issues
                        </span>
                        <span className="text-xs font-semibold flex items-center justify-center gap-1 text-white">
                          <IssueIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{isNoData ? "0" : issuesCount}</span>
                        </span>
                      </div>
                    </div>

                    {/* Honest Comparison & Trade-off Line */}
                    <div className="text-xs text-titanium-300 bg-obsidian-900/60 p-2.5 rounded-xl border border-white/5 my-2 flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 bg-white/5 text-titanium-300 border-white/10">
                        {dataSourceLabel}
                      </span>
                      <span className="leading-relaxed">
                        {isNoData
                          ? "No reports here yet. Be the first to report."
                          : route.tradeoffSummary || "Standard route alternative."}
                      </span>
                    </div>

                    {/* What to Watch For (Tappable plain language chips) */}
                    {route.hazardsEncountered.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-medium text-titanium-400 block">
                          What to watch for:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {route.hazardsEncountered.map((h) => {
                            const isSelectedCaution = selectedCaution?.id === h.id;
                            const cautionTitle = h.issue.replace("_", " ");
                            return (
                              <button
                                key={h.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectedCaution) {
                                    setSelectedCaution(null);
                                  } else {
                                    setSelectedCaution({
                                      id: h.id,
                                      text:
                                        CAUTION_EXPLANATIONS[h.issue] ||
                                        "Physical road issue noted by community commuters.",
                                    });
                                  }
                                }}
                                className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                                  isSelectedCaution
                                    ? "bg-white/20 border-white text-white font-medium"
                                    : "bg-obsidian-900 border-white/10 text-titanium-300 hover:text-white"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    h.severity >= 4 ? "bg-cyber-crimson" : "bg-cyber-amber"
                                  }`}
                                />
                                <span className="capitalize">{cautionTitle}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Tapped Caution One-line Explanation */}
                        {selectedCaution && (
                          <div className="p-2 rounded-lg bg-obsidian-950 text-xs text-white border border-white/15 animate-fade-in flex items-start gap-1.5 mt-1">
                            <Info className="w-3.5 h-3.5 text-cyber-cyan shrink-0 mt-0.5" />
                            <span>{selectedCaution.text}</span>
                          </div>
                        )}
                      </div>
                    ) : isNoData ? (
                      <div className="text-[11px] text-titanium-400 flex items-center gap-1.5 pt-1">
                        <Info className="w-3.5 h-3.5 text-titanium-500" />
                        <span>No reports here yet. Be the first to report.</span>
                      </div>
                    ) : (
                      <div className="text-xs text-cyber-emerald flex items-center gap-1.5 pt-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>No reported issues along this stretch</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Transparency Disclaimer Footer */}
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-titanium-500 leading-tight shrink-0 flex items-center justify-between">
            <span>Information, not a guarantee.</span>
            <span>Community reports & baseline.</span>
          </div>
        </>
      )}
    </div>
  );
}
