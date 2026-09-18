import { describe, expect, it } from "vitest";

import { trackedRouteSearchHref } from "./tracked-route";

describe("trackedRouteSearchHref", () => {
  it("restores every saved criterion into a search URL", () => {
    const href = trackedRouteSearchHref({
      origin: "ORD",
      destination: "LAX",
      trip_type: "round_trip",
      origin_alternates: ["MDW"],
      destination_alternates: [],
      earliest_departure_date: "2026-10-10",
      latest_departure_date: "2026-10-12",
      earliest_return_date: "2026-10-18",
      latest_return_date: "2026-10-20",
      travelers: 2,
      cabin_class: "premium_economy",
      maximum_stops: 1,
    });
    const params = new URL(href, "https://faredelta.test").searchParams;
    expect(params.get("origin")).toBe("ORD");
    expect(params.get("travelers")).toBe("2");
    expect(params.get("cabin_class")).toBe("premium_economy");
    expect(params.get("maximum_stops")).toBe("1");
    expect(params.getAll("origin_alternates")).toEqual(["MDW"]);
  });

  it("round-trips a one-way route without return dates", () => {
    const href = trackedRouteSearchHref({
      origin: "ORD",
      destination: "LAX",
      trip_type: "one_way",
      origin_alternates: [],
      destination_alternates: [],
      earliest_departure_date: "2026-10-10",
      latest_departure_date: "2026-10-12",
      earliest_return_date: null,
      latest_return_date: null,
      travelers: 1,
      cabin_class: "economy",
      maximum_stops: 0,
    });
    const params = new URL(href, "https://faredelta.test").searchParams;
    expect(params.get("trip_type")).toBe("one_way");
    expect(params.has("earliest_return_date")).toBe(false);
    expect(params.has("latest_return_date")).toBe(false);
  });
});
