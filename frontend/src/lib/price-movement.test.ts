import { describe, expect, it } from "vitest";

import { getPriceMovement } from "./price-movement";

describe("getPriceMovement", () => {
  it("detects a price drop", () => {
    expect(getPriceMovement(320, 275)).toEqual({ kind: "drop", amount: 45 });
  });

  it("distinguishes baseline, unchanged, and increased prices", () => {
    expect(getPriceMovement(null, 250).kind).toBe("baseline");
    expect(getPriceMovement(250, 250).kind).toBe("unchanged");
    expect(getPriceMovement(250, 270)).toEqual({ kind: "increase", amount: 20 });
  });
});
