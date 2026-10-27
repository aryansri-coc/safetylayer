import test from "node:test";
import assert from "node:assert";
import {
  GeolocationManager,
  checkIsInsecureContext,
  INITIAL_GEOLOCATION_STATE,
} from "../lib/location/geolocation";

test("checkIsInsecureContext: returns false in non-browser or localhost environments", () => {
  // In Node.js testing environment (typeof window === 'undefined')
  const result = checkIsInsecureContext();
  assert.strictEqual(result, false);
});

test("GeolocationManager: initializes with idle status and empty ephemeral trail", () => {
  const manager = new GeolocationManager();
  const state = manager.getState();
  assert.strictEqual(state.status, "idle");
  assert.strictEqual(state.coords, null);
  assert.strictEqual(state.accuracy, null);
  assert.strictEqual(state.isPoorAccuracy, false);
  assert.deepStrictEqual(state.trail, []);
});

test("GeolocationManager: poor accuracy (>100m) flags isPoorAccuracy=true", () => {
  const manager = new GeolocationManager();

  // Access private handler for testing state machine transition
  const handleUpdate = (manager as any).handlePositionUpdate.bind(manager);

  // Simulate position with 180m accuracy (poor signal)
  handleUpdate({
    coords: {
      latitude: 28.631,
      longitude: 77.221,
      accuracy: 180,
      heading: null,
      speed: null,
    },
  });

  const state = manager.getState();
  assert.strictEqual(state.status, "granted");
  assert.strictEqual(state.accuracy, 180);
  assert.strictEqual(state.isPoorAccuracy, true);
  assert.strictEqual(state.trail.length, 1);
});

test("GeolocationManager: accurate GPS (<100m) flags isPoorAccuracy=false", () => {
  const manager = new GeolocationManager();
  const handleUpdate = (manager as any).handlePositionUpdate.bind(manager);

  // Simulate position with 12m accuracy (good GPS)
  handleUpdate({
    coords: {
      latitude: 28.632,
      longitude: 77.222,
      accuracy: 12,
      heading: 90,
      speed: 1.5,
    },
  });

  const state = manager.getState();
  assert.strictEqual(state.status, "granted");
  assert.strictEqual(state.accuracy, 12);
  assert.strictEqual(state.isPoorAccuracy, false);
});

test("GeolocationManager: error handler maps PERMISSION_DENIED to denied with clear message", () => {
  const manager = new GeolocationManager();
  const handleError = (manager as any).handlePositionError.bind(manager);

  handleError({
    code: 1, // PERMISSION_DENIED
    message: "User denied Geolocation",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  });

  const state = manager.getState();
  assert.strictEqual(state.status, "denied");
  assert.ok(state.errorMessage?.includes("denied"));
  assert.ok(state.errorMessage?.includes("search manually"));
});

test("GeolocationManager: error handler maps TIMEOUT to timeout status", () => {
  const manager = new GeolocationManager();
  const handleError = (manager as any).handlePositionError.bind(manager);

  handleError({
    code: 3, // TIMEOUT
    message: "Timeout expired",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  });

  const state = manager.getState();
  assert.strictEqual(state.status, "timeout");
  assert.ok(state.errorMessage?.includes("timed out"));
});
