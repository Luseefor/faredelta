import type { AirportOption } from "./airports";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latitudeB - latitudeA);
  const deltaLon = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Closest scheduled airports to `code`, excluding it (and `exclude`), within `maxKm`. */
export function nearestAlternateAirports(
  airports: AirportOption[],
  code: string,
  exclude: string[] = [],
  maxKm = 100,
  limit = 1,
): AirportOption[] {
  const subject = airports.find((airport) => airport.code === code.toUpperCase());
  if (!subject || subject.latitude === null || subject.longitude === null) return [];
  const blocked = new Set([subject.code, ...exclude.map((item) => item.toUpperCase())]);
  return airports
    .filter(
      (airport) =>
        airport.scheduled &&
        airport.latitude !== null &&
        airport.longitude !== null &&
        !blocked.has(airport.code),
    )
    .map((airport) => ({
      airport,
      distance: haversineKm(
        subject.latitude as number,
        subject.longitude as number,
        airport.latitude as number,
        airport.longitude as number,
      ),
    }))
    .filter((entry) => entry.distance <= maxKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.airport);
}
