"use client";

import React from "react";
import { AlertTriangle, Compass, MapPin, Navigation, Shield, ShieldCheck, X } from "lucide-react";
import { GeolocationStatus } from "@/lib/location/geolocation";

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  status: GeolocationStatus;
  errorMessage?: string | null;
  onOpenMobileDoc?: () => void;
}

export default function LocationPromptModal({
  isOpen,
  onClose,
  onAllow,
  status,
  errorMessage,
  onOpenMobileDoc,
}: LocationPromptModalProps) {
  if (!isOpen) return null;

  const isDenied = status === "denied";
  const isInsecure = status === "insecure_context";
  const isTimeoutOrUnavailable = status === "timeout" || status === "unavailable";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md metallic-panel p-5 rounded-2xl border border-white/15 shadow-2xl text-titanium-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
              <Navigation className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">
              {isDenied
                ? "Location Access Needed"
                : isInsecure
                ? "Secure Connection Required"
                : "Enable Your Location"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-titanium-400 hover:text-white hover:bg-obsidian-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3 text-xs leading-relaxed">
          {isDenied ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-cyber-amber/10 border border-cyber-amber/25 text-titanium-200">
                <p className="font-semibold text-cyber-amber mb-1">Permission was previously denied</p>
                <p>To enable location:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1 text-titanium-300">
                  <li>Tap the lock/tune icon in your browser address bar</li>
                  <li>Toggle <strong>Location</strong> to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <p className="text-titanium-400">
                You can still search for places or tap directly on the map to choose your starting point.
              </p>
            </div>
          ) : isInsecure ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-cyber-crimson/10 border border-cyber-crimson/25 text-titanium-200">
                <p className="font-semibold text-cyber-crimson mb-1">HTTPS Context Required</p>
                <p>
                  Modern mobile browsers require HTTPS for geolocation. When accessing from a smartphone over local Wi-Fi, run an HTTPS tunnel:
                </p>
                <pre className="mt-2 p-2 rounded bg-obsidian-950 font-mono text-[11px] text-titanium-300 overflow-x-auto">
                  npx cloudflared tunnel --url http://localhost:3000
                </pre>
              </div>
              <p className="text-titanium-400">
                See <code>docs/TESTING_MOBILE_GPS.md</code> for a full guide on testing mobile GPS.
              </p>
            </div>
          ) : isTimeoutOrUnavailable ? (
            <div className="space-y-2">
              <p className="text-titanium-300">
                {errorMessage || "GPS signal is weak or unavailable. You can retry or search manually."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-titanium-200">
                SafetyLayer uses your current location to:
              </p>
              <ul className="space-y-2 text-titanium-300">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyber-emerald shrink-0 mt-0.5" />
                  <span>Show road cautions and lighting issues along your route</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
                  <span>Set your starting point automatically for route comparison</span>
                </li>
                <li className="flex items-start gap-2">
                  <Compass className="w-4 h-4 text-cyber-amber shrink-0 mt-0.5" />
                  <span>Prefill location when you report a physical road issue</span>
                </li>
              </ul>

              {/* Privacy Guarantee Note */}
              <div className="p-2.5 rounded-xl bg-obsidian-900 border border-white/10 flex items-center gap-2 text-[11px] text-titanium-400">
                <Shield className="w-4 h-4 text-cyber-emerald shrink-0" />
                <span>
                  <strong>Privacy first:</strong> Your coordinates are held only in temporary browser memory. We never track you or send your location on page load.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-titanium-400 hover:text-white rounded-xl hover:bg-obsidian-800 transition-colors"
          >
            {isDenied || isInsecure ? "Got it" : "Not Now"}
          </button>
          {!isDenied && !isInsecure && (
            <button
              onClick={() => {
                onClose();
                onAllow();
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-obsidian-950 hover:brightness-110 shadow-lg shadow-white/10 transition-all flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              <span>Allow Location</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
