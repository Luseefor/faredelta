import type { FlightOffer, SortMode } from "@/lib/types";

function compareStable(a: FlightOffer, b: FlightOffer) {
  return a.id.localeCompare(b.id);
}

export function sortFlightOffers(offers: FlightOffer[], mode: SortMode) {
  if (offers.length < 2) return [...offers];

  const prices = offers.map((offer) => offer.price);
  const durations = offers.map((offer) => offer.duration_minutes);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const priceRange = Math.max(1, maxPrice - minPrice);
  const durationRange = Math.max(1, maxDuration - minDuration);

  return [...offers].sort((a, b) => {
    if (mode === "cheapest") {
      return (
        a.price - b.price ||
        a.duration_minutes - b.duration_minutes ||
        compareStable(a, b)
      );
    }
    if (mode === "fastest") {
      return (
        a.duration_minutes - b.duration_minutes ||
        a.price - b.price ||
        compareStable(a, b)
      );
    }
    const score = (offer: FlightOffer) =>
      ((offer.price - minPrice) / priceRange) * 0.6 +
      ((offer.duration_minutes - minDuration) / durationRange) * 0.3 +
      offer.stops * 0.1;
    return score(a) - score(b) || a.price - b.price || compareStable(a, b);
  });
}
