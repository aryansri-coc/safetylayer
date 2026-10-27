import test from "node:test";
import assert from "node:assert";
import { OsmPhotonGeocodingProvider } from "../lib/geocoding/provider";

test("OsmPhotonGeocodingProvider: requires min 3 characters", async () => {
  const provider = new OsmPhotonGeocodingProvider();
  const empty = await provider.search("");
  assert.deepStrictEqual(empty, []);

  const short = await provider.search("ab");
  assert.deepStrictEqual(short, []);
});

test("OsmPhotonGeocodingProvider: handles geocoding query structure and attribution", async () => {
  const provider = new OsmPhotonGeocodingProvider();
  assert.strictEqual(provider.name, "OpenStreetMap / Photon");

  // Mock global fetch for deterministic unit testing
  const originalFetch = global.fetch;
  global.fetch = async (url: any) => {
    return {
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [77.2205, 28.6335] },
            properties: {
              name: "Connaught Place",
              street: "Inner Circle",
              city: "New Delhi",
              country: "India",
              osm_id: 12345,
            },
          },
        ],
      }),
    } as any;
  };

  try {
    const results = await provider.search("Connaught Place", {
      center: { lat: 28.63, lng: 77.22 },
      limit: 5,
    });

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, "Connaught Place");
    assert.strictEqual(results[0].lat, 28.6335);
    assert.strictEqual(results[0].lng, 77.2205);
    assert.ok(results[0].attribution?.includes("OpenStreetMap"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("OsmPhotonGeocodingProvider: gracefully handles network failure without throwing", async () => {
  const provider = new OsmPhotonGeocodingProvider();
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Network offline");
  };

  try {
    const results = await provider.search("Safdarjung", {
      center: { lat: 28.63, lng: 77.22 },
    });
    assert.deepStrictEqual(results, []);
  } finally {
    global.fetch = originalFetch;
  }
});
