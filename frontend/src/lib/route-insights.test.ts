import { describe, expect, it } from "vitest";

import {
  computeWatchlistStats,
  filterRoutes,
  priceDrops,
  sortRoutes,
} from "./route-insights";
import type { TrackedRoute } from "./types";

function route(overrides: Partial<TrackedRoute> & { id: string }): TrackedRoute {
  return {
    origin: "ORD",
    destination: "LAX",
    trip_type: "round_trip",
    origin_alternates: [],
    destination_alternates: [],
    earliest_departure_date: "2026-10-10",
    latest_departure_date: "2026-10-12",
    earliest_return_date: "2026-10-16",
    latest_return_date: "2026-10-19",
    travelers: 1,
    cabin_class: "economy",
    maximum_stops: 1,
    active: true,
    paused: false,
    created_at: "2026-09-01T00:00:00Z",
    refresh_cadence_hours: 24,
    next_refresh_at: null,
    consecutive_failures: 0,
    previous_price: null,
    last_price: null,
    currency: null,
    last_checked_at: null,
    ...overrides,
  };
}

describe("route insights", () => {
  it("computes watchlist stats and ranks drops", () => {
    const routes = [
      route({ id: "a", previous_price: 400, last_price: 300, currency: "USD" }),
      route({ id: "b", previous_price: 200, last_price: 250, currency: "USD" }),
      route({ id: "c", last_price: 150, currency: "USD", paused: true }),
      route({ id: "d" }),
    ];
    expect(priceDrops(routes).map((drop) => drop.route.id)).toEqual(["a"]);
    expect(computeWatchlistStats(routes)).toEqual({
      total: 4,
      withPrice: 3,
      drops: 1,
      paused: 1,
      averageDrop: 100,
    });
  });

  it("returns null average drop without drops", () => {
    expect(computeWatchlistStats([route({ id: "a" })]).averageDrop).toBeNull();
  });

  it("filters by airport code case-insensitively", () => {
    const routes = [route({ id: "a" }), route({ id: "b", origin: "JFK", destination: "SFO" })];
    expect(filterRoutes(routes, "jfk").map((item) => item.id)).toEqual(["b"]);
    expect(filterRoutes(routes, "  ").length).toBe(2);
  });

  it("sorts by recency, price, and drop size", () => {
    const routes = [
      route({ id: "old", created_at: "2026-08-01T00:00:00Z", last_price: 500, currency: "USD" }),
      route({ id: "new", created_at: "2026-09-01T00:00:00Z", previous_price: 500, last_price: 100, currency: "USD" }),
      route({ id: "unpriced", created_at: "2026-09-02T00:00:00Z" }),
    ];
    expect(sortRoutes(routes, "recent").map((item) => item.id)).toEqual(["unpriced", "new", "old"]);
    expect(sortRoutes(routes, "lowest-price").map((item) => item.id)).toEqual(["new", "old", "unpriced"]);
    expect(sortRoutes(routes, "biggest-drop")[0].id).toBe("new");
  });
});
