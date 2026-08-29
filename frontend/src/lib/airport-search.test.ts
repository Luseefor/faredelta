import { describe, expect, it } from "vitest";

import { airportCount, searchAirports } from "./airport-search";

describe("worldwide airport search", () => {
  it("contains thousands of active IATA airports", () => {
    expect(airportCount()).toBeGreaterThan(8_000);
  });

  it("ranks exact IATA codes first", () => {
    expect(searchAirports("ord")[0]).toMatchObject({ code: "ORD", city: "Chicago" });
  });

  it("searches city, airport name, region, and country", () => {
    expect(searchAirports("Reykjavik").some((airport) => airport.code === "KEF")).toBe(true);
    expect(searchAirports("Heathrow")[0].code).toBe("LHR");
    expect(searchAirports("New Zealand").some((airport) => airport.country === "New Zealand")).toBe(true);
  });

  it("handles accents and returns a limited result set", () => {
    expect(searchAirports("sao paulo").some((airport) => airport.city.includes("São Paulo"))).toBe(true);
    expect(searchAirports("international", 5)).toHaveLength(5);
  });
});
