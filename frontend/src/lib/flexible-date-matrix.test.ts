import { describe, expect, it } from "vitest";

import { buildFareMatrix, farePairKey } from "./flexible-date-matrix";
import type { FlightOffer } from "./types";

function offer(id: string, departureDate: string, returnDate: string, price: number): FlightOffer {
  return {
    id,
    provider: "Mock",
    airline: { code: "FD", name: "FareDelta" },
    origin: { code: "ORD", name: null },
    destination: { code: "LAX", name: null },
    departure_time: `${departureDate}T12:00:00Z`,
    arrival_time: `${departureDate}T16:00:00Z`,
    duration_minutes: 240,
    stops: 0,
    price,
    currency: "USD",
    cabin_class: "economy",
    booking_url: "https://example.invalid",
    retrieved_at: "2026-08-29T12:00:00Z",
    segments: [],
    return_date: returnDate,
  };
}

describe("buildFareMatrix", () => {
  it("creates sorted axes and keeps the lowest fare for each date pair", () => {
    const matrix = buildFareMatrix([
      offer("later", "2026-10-12", "2026-10-20", 280),
      offer("high", "2026-10-10", "2026-10-18", 240),
      offer("low", "2026-10-10", "2026-10-18", 190),
    ]);

    expect(matrix.departureDates).toEqual(["2026-10-10", "2026-10-12"]);
    expect(matrix.returnDates).toEqual(["2026-10-18", "2026-10-20"]);
    expect(matrix.cells.get(farePairKey("2026-10-10", "2026-10-18"))).toMatchObject({
      lowestPrice: 190,
      offerCount: 2,
    });
    expect(matrix.cheapestKey).toBe("2026-10-10|2026-10-18");
  });

  it("returns an empty matrix when there are no offers", () => {
    expect(buildFareMatrix([])).toMatchObject({
      departureDates: [],
      returnDates: [],
      cheapestKey: null,
    });
  });
});
