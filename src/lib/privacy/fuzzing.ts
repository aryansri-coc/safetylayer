/**
 * Fuzz coordinates by 20 to 30 meters before public aggregation to protect reporter location privacy.
 */
export function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const angle = Math.random() * Math.PI * 2;
  const distMeters = 20 + Math.random() * 10; // 20 - 30 meters
  const deltaLat = (distMeters * Math.cos(angle)) / 111320;
  const deltaLng = (distMeters * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: Math.round((lat + deltaLat) * 100000) / 100000,
    lng: Math.round((lng + deltaLng) * 100000) / 100000,
  };
}
