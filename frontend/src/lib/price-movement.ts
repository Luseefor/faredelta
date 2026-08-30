export type PriceMovement =
  | { kind: "unavailable"; amount: 0 }
  | { kind: "baseline"; amount: 0 }
  | { kind: "drop" | "increase"; amount: number }
  | { kind: "unchanged"; amount: 0 };

export function getPriceMovement(
  previousPrice: number | null,
  lastPrice: number | null,
): PriceMovement {
  if (lastPrice === null) return { kind: "unavailable", amount: 0 };
  if (previousPrice === null) return { kind: "baseline", amount: 0 };
  const difference = lastPrice - previousPrice;
  if (difference < 0) return { kind: "drop", amount: Math.abs(difference) };
  if (difference > 0) return { kind: "increase", amount: difference };
  return { kind: "unchanged", amount: 0 };
}
