"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowUpDown, Clock, MapPin, Navigation, Search, X } from "lucide-react";
import { GeocodingResult } from "@/lib/geocoding/provider";

export interface SelectedLocation {
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
  isCurrentLocation?: boolean;
}

interface LocationSearchBarProps {
  origin: SelectedLocation;
  destination: SelectedLocation | null;
  onSelectOrigin: (loc: SelectedLocation) => void;
  onSelectDestination: (loc: SelectedLocation) => void;
  onSwapLocations: () => void;
  onGetRoutes?: () => void;
  mapCenter?: { lat: number; lng: number };
  onClearDestination?: () => void;
}

const RECENT_SEARCHES_KEY = "safetylayer_recent_searches";

export default function LocationSearchBar({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
  onSwapLocations,
  onGetRoutes,
  mapCenter = { lat: 28.6315, lng: 77.2167 },
  onClearDestination,
}: LocationSearchBarProps) {
  const [activeField, setActiveField] = useState<"origin" | "destination">("destination");
  const [destinationInput, setDestinationInput] = useState(destination?.name || "");
  const [originInput, setOriginInput] = useState(origin?.name || "Your location");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SelectedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attribution, setAttribution] = useState<string>("© OpenStreetMap contributors, Photon");
  const [noResults, setNoResults] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputs with props
  useEffect(() => {
    if (destination) {
      setDestinationInput(destination.name);
    } else {
      setDestinationInput("");
    }
  }, [destination]);

  useEffect(() => {
    if (origin.isCurrentLocation) {
      setOriginInput("Your location");
    } else {
      setOriginInput(origin.name);
    }
  }, [origin]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Non-critical if localStorage is blocked
    }
  }, []);

  const saveRecentSearch = (loc: SelectedLocation) => {
    try {
      const updated = [
        loc,
        ...recentSearches.filter((item) => item.lat !== loc.lat || item.lng !== loc.lng),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage write errors
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setNoResults(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced search logic with AbortController for stale requests
  const handleQueryChange = (val: string, field: "origin" | "destination") => {
    if (field === "destination") {
      setDestinationInput(val);
    } else {
      setOriginInput(val);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 3) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSuggestions([]);
      setNoResults(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNoResults(false);

    debounceTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const url = `/api/geocode?q=${encodeURIComponent(trimmed)}&lat=${mapCenter.lat}&lng=${mapCenter.lng}&limit=5`;
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setSuggestions(data.results);
            setNoResults(false);
            if (data.attribution) setAttribution(data.attribution);
          } else {
            setSuggestions([]);
            setNoResults(true);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Geocoding fetch error:", err);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelectResult = (result: GeocodingResult) => {
    const loc: SelectedLocation = {
      name: result.name,
      fullAddress: result.fullAddress,
      lat: result.lat,
      lng: result.lng,
    };

    saveRecentSearch(loc);
    setSuggestions([]);
    setNoResults(false);

    if (activeField === "destination") {
      setDestinationInput(loc.name);
      onSelectDestination(loc);
    } else {
      setOriginInput(loc.name);
      onSelectOrigin(loc);
    }
  };

  const handleClearDestination = () => {
    setDestinationInput("");
    setSuggestions([]);
    setNoResults(false);
    if (onClearDestination) onClearDestination();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg z-30 font-sans select-none">
      {/* Search Bar Input Container */}
      <div className="bg-obsidian-950/95 rounded-2xl border border-white/20 p-2.5 sm:p-3 shadow-2xl backdrop-blur-2xl space-y-2">
        {/* Origin Field ("From" - always visible per A3 & B6) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-900 border border-white/10 focus-within:border-white/30 transition-all min-h-[44px]">
            <Navigation className="w-4 h-4 text-cyber-emerald shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-mono tracking-wider text-titanium-400 block -mb-0.5">
                From
              </span>
              <input
                id="origin-search-input"
                type="text"
                value={originInput}
                onFocus={() => setActiveField("origin")}
                onChange={(e) => handleQueryChange(e.target.value, "origin")}
                placeholder="Starting location (Default: Your location)"
                aria-label="Starting location"
                className="w-full bg-transparent text-xs text-white placeholder:text-titanium-400 focus:outline-none font-medium truncate"
              />
            </div>
          </div>

          {/* Swap Button (Min 44px tap target per B6) */}
          <button
            onClick={onSwapLocations}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-800 border border-white/10 text-titanium-200 hover:text-white transition-all shadow-md flex items-center justify-center shrink-0"
            title="Swap start and destination locations"
            aria-label="Swap start and destination locations"
          >
            <ArrowUpDown className="w-4 h-4 text-cyber-cyan" />
          </button>
        </div>

        {/* Destination Field ("To / Where to?" - always visible per A3 & B6) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-obsidian-900 border border-white/10 focus-within:border-white/30 transition-all min-h-[44px]">
            <Search className="w-4 h-4 text-cyber-cyan shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-mono tracking-wider text-titanium-400 block -mb-0.5">
                To
              </span>
              <input
                id="destination-search-input"
                type="text"
                value={destinationInput}
                onFocus={() => setActiveField("destination")}
                onChange={(e) => handleQueryChange(e.target.value, "destination")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onGetRoutes) {
                    onGetRoutes();
                  }
                }}
                placeholder="Where to? (e.g. Connaught Place, Janpath)"
                aria-label="Destination address"
                className="w-full bg-transparent text-sm text-white placeholder:text-titanium-400 focus:outline-none font-medium truncate"
              />
            </div>
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            )}
            {destinationInput && (
              <button
                onClick={handleClearDestination}
                className="min-h-[32px] min-w-[32px] p-1 rounded-full text-titanium-400 hover:text-white hover:bg-obsidian-800 flex items-center justify-center"
                title="Clear destination"
                aria-label="Clear destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Prominent High-Contrast "Get routes" Button (B6: Min 44px tap target) */}
          <button
            onClick={() => {
              if (onGetRoutes) onGetRoutes();
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-obsidian-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-1.5 shrink-0"
            title="Get routes"
            aria-label="Get routes"
          >
            <span>Get routes</span>
          </button>
        </div>
      </div>

      {/* Autocomplete Suggestions / Recents Dropdown */}
      {(suggestions.length > 0 || (destinationInput.length >= 3 && noResults)) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-obsidian-950/98 rounded-2xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-2xl z-50 animate-fade-in text-titanium-200">
          {noResults ? (
            <div className="p-4 text-center text-xs text-titanium-300">
              No matching places found. Try another search or tap on the map.
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  <MapPin className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                    <div className="text-[11px] text-titanium-300 truncate">{item.fullAddress}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Attribution Footer */}
          <div className="px-3 py-1.5 bg-obsidian-950 border-t border-white/10 text-[10px] text-titanium-400 flex items-center justify-between font-mono">
            <span>{attribution}</span>
            <span>OSM bias: India</span>
          </div>
        </div>
      )}

      {/* Recent Searches Dropdown (when input is focused and empty) */}
      {!destinationInput && activeField === "destination" && recentSearches.length > 0 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-obsidian-950/98 rounded-2xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-2xl z-50 text-titanium-200 animate-fade-in">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-titanium-300 border-b border-white/5 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyber-cyan" />
            <span>Recent Searches</span>
          </div>
          <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
            {recentSearches.map((rec, i) => (
              <button
                key={`recent_${i}`}
                onClick={() => {
                  setDestinationInput(rec.name);
                  onSelectDestination(rec);
                }}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/10 transition-colors min-h-[44px]"
              >
                <Clock className="w-3.5 h-3.5 text-titanium-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-titanium-200 truncate block">{rec.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
