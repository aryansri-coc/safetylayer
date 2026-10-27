import { GPSPoint } from "@/types";

export type GeolocationStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "timeout"
  | "unavailable"
  | "insecure_context";

export interface GeolocationState {
  status: GeolocationStatus;
  coords: { lat: number; lng: number } | null;
  accuracy: number | null; // meters
  isPoorAccuracy: boolean; // > 100 meters
  heading: number | null;
  speed: number | null;
  errorMessage: string | null;
  lastUpdated: number | null;
  trail: GPSPoint[]; // Ephemeral in-memory trail buffer for physical presence check
}

export const INITIAL_GEOLOCATION_STATE: GeolocationState = {
  status: "idle",
  coords: null,
  accuracy: null,
  isPoorAccuracy: false,
  heading: null,
  speed: null,
  errorMessage: null,
  lastUpdated: null,
  trail: [],
};

/**
 * Check if the current browser environment is an insecure context for Geolocation
 */
export function checkIsInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (!isLocalhost && window.location.protocol !== "https:") {
    return true;
  }
  return false;
}

/**
 * Geolocation Manager
 * Manages navigator.geolocation lifecycle, visibility pausing, and ephemeral trail buffering
 */
export class GeolocationManager {
  private watchId: number | null = null;
  private state: GeolocationState = { ...INITIAL_GEOLOCATION_STATE };
  private listeners: ((state: GeolocationState) => void)[] = [];
  private isTrackingActive = false;

  constructor() {
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  subscribe(listener: (state: GeolocationState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  private handleVisibilityChange = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      // Pause watchPosition when tab is hidden to save battery & respect privacy
      if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    } else if (document.visibilityState === "visible" && this.isTrackingActive) {
      // Resume watchPosition when tab becomes visible
      this.startWatchPosition();
    }
  };

  getState(): GeolocationState {
    return this.state;
  }

  requestLocation(): Promise<GeolocationState> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        this.state = {
          ...this.state,
          status: "unavailable",
          errorMessage: "Geolocation is not supported by your browser or device.",
        };
        this.notify();
        return resolve(this.state);
      }

      if (checkIsInsecureContext()) {
        this.state = {
          ...this.state,
          status: "insecure_context",
          errorMessage:
            "Geolocation requires a secure context (HTTPS or localhost). Testing on mobile requires an HTTPS tunnel.",
        };
        this.notify();
        return resolve(this.state);
      }

      this.state = {
        ...this.state,
        status: "prompting",
        errorMessage: null,
      };
      this.notify();

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.handlePositionUpdate(position);
          this.isTrackingActive = true;
          this.startWatchPosition();
          resolve(this.state);
        },
        (error) => {
          this.handlePositionError(error);
          resolve(this.state);
        },
        options
      );
    });
  }

  private startWatchPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }

  private handlePositionUpdate(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    const isPoorAccuracy = accuracy > 100;
    const now = Date.now();

    // Append to ephemeral trail buffer (max 12 points, never sent automatically on page load)
    const newPoint: GPSPoint = {
      lat: latitude,
      lng: longitude,
      timestamp: now,
      accuracy,
      speed: speed || 0,
      speedKmh: speed ? Math.round(speed * 3.6) : 0,
    };

    const updatedTrail = [...this.state.trail.slice(-11), newPoint];

    this.state = {
      status: "granted",
      coords: { lat: latitude, lng: longitude },
      accuracy: Math.round(accuracy),
      isPoorAccuracy,
      heading: heading || null,
      speed: speed || null,
      errorMessage: null,
      lastUpdated: now,
      trail: updatedTrail,
    };
    this.notify();
  }

  private handlePositionError(error: GeolocationPositionError) {
    let status: GeolocationStatus = "unavailable";
    let errorMessage = "Unable to retrieve your location.";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        status = "denied";
        errorMessage =
          "Location permission was denied. Enable location in your browser address bar or device settings, or search manually.";
        break;
      case error.TIMEOUT:
        status = "timeout";
        errorMessage = "Location request timed out. Retrying or search manually.";
        break;
      case error.POSITION_UNAVAILABLE:
        status = "unavailable";
        errorMessage = "GPS signal is currently unavailable on this device.";
        break;
    }

    this.state = {
      ...this.state,
      status,
      errorMessage,
    };
    this.notify();
  }

  stopTracking() {
    this.isTrackingActive = false;
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state = {
      ...this.state,
      status: "idle",
    };
    this.notify();
  }

  destroy() {
    this.stopTracking();
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    this.listeners = [];
  }
}

let globalGeoManager: GeolocationManager | null = null;
export function getGeolocationManager(): GeolocationManager {
  if (!globalGeoManager) {
    globalGeoManager = new GeolocationManager();
  }
  return globalGeoManager;
}
