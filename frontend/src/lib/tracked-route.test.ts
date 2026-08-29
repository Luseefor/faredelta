import { describe, expect, it } from "vitest";

import { trackedRouteSearchHref } from "./tracked-route";

describe("trackedRouteSearchHref", () => {
  it("restores every saved criterion into a search URL", () => {
    const href = trackedRouteSearchHref({
      origin: "ORD",
      destination: "LAX",
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
  });
});
