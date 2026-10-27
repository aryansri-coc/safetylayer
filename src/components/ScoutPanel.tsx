"use client";

import React, { useState } from "react";
import { ScoutMission, TrustProfile } from "@/types";
import { Award, Bike, CheckCircle2, Crosshair, Flame, MapPin, Navigation, Shield, ShieldAlert, Sparkles, X } from "lucide-react";

interface ScoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: TrustProfile;
  missions?: ScoutMission[];
  onMissionClaimed?: (missionId: string) => void;
}

export default function ScoutPanel({
  isOpen,
  onClose,
  profile,
  missions = [],
  onMissionClaimed = () => {},
}: ScoutPanelProps) {
  const [isStationary, setIsStationary] = useState(true);
  const [stationarySeconds, setStationarySeconds] = useState(8);
  const [activeTab, setActiveTab] = useState<"missions" | "profile">("missions");
  const [isSubmittingMission, setIsSubmittingMission] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaimMission = async (m: ScoutMission) => {
    if (!isStationary || stationarySeconds < 3) {
      alert("Safety Rule: You must be safely stationary / parked before recording a scout report.");
      return;
    }

    setIsSubmittingMission(m.id);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.userId || "user_scout_arjun",
          segmentId: m.segmentId,
          stationaryDurationSeconds: stationarySeconds,
          speedKmh: 0,
          verifiedStatus: "lamp_dead",
        }),
      });

      const data = await res.json();
      if (data.success) {
        onMissionClaimed(m.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingMission(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg metallic-panel p-6 rounded-2xl border border-white/10 shadow-2xl text-titanium-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-obsidian-800 border border-white/10 text-cyber-cyan">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Scout Rider Telemetry
              </h3>
              <p className="text-[10px] text-titanium-500">
                STATIONARY-LOCKED CROWDSOURCED VERIFICATION
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-titanium-400 hover:text-white rounded-lg hover:bg-obsidian-800 border border-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stationary Safety Sensor Banner */}
        <div className="my-3.5 p-3 rounded-xl border flex items-center justify-between bg-obsidian-900 border-white/10 font-mono">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isStationary ? "bg-cyber-emerald animate-pulse" : "bg-cyber-crimson animate-ping"
              }`}
            />
            <div>
              <div className="text-xs font-bold text-white">
                {isStationary ? "STATIONARY SENSOR: PARKED SAFE" : "VEHICLE MOTION DETECTED"}
              </div>
              <div className="text-[10px] text-titanium-400">
                {isStationary
                  ? `HALTED FOR ${stationarySeconds}s • VERIFICATION UNLOCKED`
                  : "SAFETY LOCK ACTIVE • PARK VEHICLE TO REPORT"}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsStationary(!isStationary);
              setStationarySeconds(isStationary ? 0 : 10);
            }}
            className="text-[10px] px-2.5 py-1 rounded metallic-chip text-titanium-300 hover:text-white border border-white/10"
          >
            TOGGLE SENSOR
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 p-1 rounded-xl bg-obsidian-900 border border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab("missions")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "missions"
                ? "bg-white/10 text-white border border-white/20"
                : "text-titanium-500 hover:text-titanium-300"
            }`}
          >
            ACTIVE REQUESTS ({missions.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "profile"
                ? "bg-white/10 text-white border border-white/20"
                : "text-titanium-500 hover:text-titanium-300"
            }`}
          >
            RIDER CREDIBILITY PROFILE
          </button>
        </div>

        {/* Tab 1: Missions */}
        {activeTab === "missions" ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[11px] text-titanium-400 flex items-center justify-between">
              <span>UNVERIFIED HIGH-UNCERTAINTY CORRIDORS</span>
              <span className="text-cyber-emerald font-bold">+35 to +50 BOUNTY PTS</span>
            </div>

            {missions.length === 0 ? (
              <div className="p-8 text-center text-xs text-titanium-500 bg-obsidian-900/40 rounded-xl border border-white/5">
                All nearby segments currently corroborated.
              </div>
            ) : (
              missions.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-obsidian-900/80 border border-white/10 space-y-2 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white font-sans">{m.title}</div>
                      <div className="text-[10px] text-titanium-400 flex items-center gap-1 mt-0.5">
                        <Crosshair className="w-3 h-3 text-cyber-cyan" />
                        <span>GPS: {m.coordinates.lat.toFixed(4)}, {m.coordinates.lng.toFixed(4)}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded metallic-chip text-cyber-cyan border border-cyber-cyan/30">
                      +{m.bountyPoints} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => handleClaimMission(m)}
                      disabled={!isStationary || isSubmittingMission === m.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-b from-white to-titanium-200 text-obsidian-950 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md shadow-white/10 hover:brightness-110 active:scale-95"
                    >
                      {isSubmittingMission === m.id ? (
                        <span>LOGGING...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>1-TAP CONFIRM STATUS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab 2: Profile */
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-obsidian-900/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-titanium-400">RIDER RELIABILITY (BETA POSTERIOR):</span>
                <span className="text-base font-bold text-cyber-emerald">
                  {profile ? `${Math.round(profile.reliabilityScore * 100)}%` : "94%"}
                </span>
              </div>
              <div className="text-[11px] text-titanium-400 font-sans">
                Bayesian Score: <span className="font-mono text-white">Beta({profile?.alpha || 30}, {profile?.beta || 2})</span>.
                Rewards corroborated accuracy over volume.
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-titanium-300">
                <div>CORRIDORS INSPECTED: <span className="font-bold text-white">{profile?.totalReports || 32}</span></div>
                <div>KM SURVEYED: <span className="font-bold text-white">{profile?.kmScouted || 84.9} KM</span></div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <span className="text-[10px] font-mono text-titanium-500 uppercase tracking-wider block mb-2">
                VERIFIED ACCREDITATIONS
              </span>
              <div className="flex flex-wrap gap-2">
                {(profile?.badges || ["Night Owl Scout", "Centurion Verifier", "Road Guardian"]).map((b) => (
                  <span
                    key={b}
                    className="px-2.5 py-1 rounded-lg metallic-chip text-titanium-200 border border-white/10 flex items-center gap-1.5 text-[11px]"
                  >
                    <Award className="w-3.5 h-3.5 text-cyber-amber" />
                    <span>{b.toUpperCase()}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Privacy Safeguards */}
            <div className="p-3 rounded-xl bg-obsidian-950 border border-white/10 space-y-1.5 text-titanium-400">
              <div className="text-white font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyber-emerald" />
                <span>RIDER PRIVACY ENFORCEMENT</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] font-sans">
                <li>Automatic 500m Home/Origin blackout privacy radius.</li>
                <li>Public profiles reveal aggregate badges and surveyed distance only; raw GPS traces are never visible.</li>
                <li>Delayed telemetry display (20 min) prevents tracking.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
