import { describe, expect, it } from "vitest";

import type { AirportOption } from "./airports";
import { haversineKm, nearestAlternateAirports } from "./geo";

function airport(overrides: Partial<AirportOption> & { code: string }): AirportOption {
  return {
    city: "Testville",
    name: "Testville Airport",
    region: "Test",
    country: "Testland",
    type: "large_airport",
    scheduled: true,
    latitude: 41.0,
    longitude: -87.0,
    ...overrides,
  };
}

describe("geo helpers", () => {
  it("measures great-circle distance", () => {
    // Chicago O'Hare to Midway is roughly 25 km.
    expect(haversineKm(41.979, -87.905, 41.786, -87.752)).toBeCloseTo(25, 0);
    expect(haversineKm(41.0, -87.0, 41.0, -87.0)).toBe(0);
  });

  it("finds the nearest scheduled alternate within range", () => {
    const airports = [
      airport({ code: "AAA", latitude: 41.0, longitude: -87.0 }),
      airport({ code: "BBB", latitude: 41.1, longitude: -87.0 }),
      airport({ code: "CCC", latitude: 45.0, longitude: -87.0 }),
      airport({ code: "DDD", latitude: 41.05, longitude: -87.0, scheduled: false }),
    ];
    expect(nearestAlternateAirports(airports, "AAA").map((item) => item.code)).toEqual(["BBB"]);
    expect(nearestAlternateAirports(airports, "AAA", ["BBB"])).toEqual([]);
    expect(nearestAlternateAirports(airports, "ZZZ")).toEqual([]);
  });
});
