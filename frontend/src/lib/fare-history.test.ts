import { describe, expect, it } from "vitest";

import { buildFareTrend } from "./fare-history";
import type { FareHistoryPoint } from "./types";

const point = (lowestPrice: number): FareHistoryPoint => ({
  retrieved_at: "2026-08-29T12:00:00Z",
  lowest_price: lowestPrice,
  currency: "USD",
  offers_sampled: 9,
});

describe("buildFareTrend", () => {
  it("scales prices from left to right and low to high", () => {
    const trend = buildFareTrend([point(200), point(300), point(250)], 100, 50);
    expect(trend.map(({ x, y }) => [x, y])).toEqual([
      [0, 50],
      [50, 0],
      [100, 25],
    ]);
  });

  it("centers a single flat observation", () => {
    expect(buildFareTrend([point(200)], 100, 50)[0]).toMatchObject({ x: 50, y: 25 });
  });
});
