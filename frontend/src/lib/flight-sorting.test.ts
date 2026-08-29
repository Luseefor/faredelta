import { describe, expect, it } from "vitest";
import { sortFlightOffers } from "./flight-sorting";
import type { FlightOffer } from "./types";

function offer(id: string, price: number, duration: number, stops = 0): FlightOffer {
  return {
    id,
    provider: "Mock",
    airline: { code: "FD", name: "FareDelta" },
    origin: { code: "ORD", name: null },
    destination: { code: "LAX", name: null },
    departure_time: "2026-10-10T12:00:00Z",
    arrival_time: "2026-10-10T16:00:00Z",
    duration_minutes: duration,
    stops,
    price,
    currency: "USD",
    cabin_class: "economy",
    booking_url: "https://example.invalid",
    retrieved_at: "2026-08-29T12:00:00Z",
    segments: [],
    return_date: "2026-10-16",
  };
}

describe("sortFlightOffers", () => {
  const offers = [offer("balanced", 230, 210), offer("cheap", 180, 330, 1), offer("fast", 330, 150)];

  it("sorts cheapest with duration as a tie-breaker", () => {
    expect(sortFlightOffers(offers, "cheapest")[0].id).toBe("cheap");
  });

  it("sorts fastest with price as a tie-breaker", () => {
    expect(sortFlightOffers(offers, "fastest")[0].id).toBe("fast");
  });

  it("calculates a stable best score without mutating input", () => {
    const original = [...offers];
    expect(sortFlightOffers(offers, "best")[0].id).toBe("balanced");
    expect(offers).toEqual(original);
  });
});
