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
  mapCenter?: { lat: number; lng: number };
  onClearDestination?: () => void;
}

const RECENT_SEARCHES_KEY = "safelayer_recent_searches";

export default function LocationSearchBar({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
  onSwapLocations,
  mapCenter = { lat: 28.6315, lng: 77.2167 },
  onClearDestination,
}: LocationSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div ref={containerRef} className="relative w-full max-w-lg z-30 font-sans">
      {/* Search Bar Input Container */}
      <div className="metallic-panel rounded-2xl border border-white/15 p-2.5 shadow-2xl backdrop-blur-xl">
        {/* Destination Field (Primary) */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-obsidian-900/90 border border-white/10 focus-within:border-white/30 transition-all">
          <Search className="w-4 h-4 text-cyber-cyan shrink-0" />
          <input
            id="destination-search-input"
            type="text"
            value={destinationInput}
            onFocus={() => {
              setActiveField("destination");
              if (!destinationInput && recentSearches.length > 0) {
                // Show recents
              }
            }}
            onChange={(e) => handleQueryChange(e.target.value, "destination")}
            placeholder="Where to? (e.g. Connaught Place, Janpath)"
            className="w-full bg-transparent text-sm text-white placeholder:text-titanium-500 focus:outline-none font-medium"
          />
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
          )}
          {destinationInput && (
            <button
              onClick={handleClearDestination}
              className="p-1 rounded-full text-titanium-400 hover:text-white hover:bg-obsidian-800"
              title="Clear destination"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
              isExpanded
                ? "bg-white/15 border-white/30 text-white"
                : "bg-obsidian-800 border-white/10 text-titanium-400 hover:text-white"
            }`}
            title="Toggle route origin & destination options"
          >
            {isExpanded ? "Close" : "Route"}
          </button>
        </div>

        {/* Expandable Route Origin & Destination Controls */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2 animate-fade-in text-xs">
            {/* Origin Field */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-900/70 border border-white/10 focus-within:border-white/30">
                <Navigation className="w-3.5 h-3.5 text-cyber-emerald shrink-0" />
                <input
                  type="text"
                  value={originInput}
                  onFocus={() => setActiveField("origin")}
                  onChange={(e) => handleQueryChange(e.target.value, "origin")}
                  placeholder="From (Default: Your location)"
                  className="w-full bg-transparent text-xs text-titanium-200 placeholder:text-titanium-500 focus:outline-none"
                />
              </div>

              {/* Swap Origin / Destination Button */}
              <button
                onClick={onSwapLocations}
                className="p-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-titanium-300 hover:text-white transition-all shadow-sm"
                title="Swap origin and destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions / Recents Dropdown */}
      {(suggestions.length > 0 || (destinationInput.length >= 3 && noResults)) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 metallic-panel rounded-2xl border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl z-50 animate-fade-in text-titanium-200">
          {noResults ? (
            <div className="p-4 text-center text-xs text-titanium-400">
              No matching places found. Try another search or tap on the map.
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-white/10 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                    <div className="text-[11px] text-titanium-400 truncate">{item.fullAddress}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Attribution Footer */}
          <div className="px-3 py-1.5 bg-obsidian-950/80 border-t border-white/5 text-[10px] text-titanium-500 flex items-center justify-between">
            <span>{attribution}</span>
            <span>OSM bias: India</span>
          </div>
        </div>
      )}

      {/* Recent Searches Dropdown (when input is focused and empty) */}
      {!destinationInput && isExpanded && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 metallic-panel rounded-2xl border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl z-50 text-titanium-200">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-titanium-400 border-b border-white/5 flex items-center gap-1.5">
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
                className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-white/10 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-titanium-500 shrink-0" />
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
