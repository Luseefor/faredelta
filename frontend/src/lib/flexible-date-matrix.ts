import type { FlightOffer } from "@/lib/types";

export interface FareMatrixCell {
  key: string;
  departureDate: string;
  returnDate: string;
  lowestPrice: number;
  currency: string;
  offerCount: number;
}

export interface FareMatrix {
  departureDates: string[];
  returnDates: string[];
  cells: Map<string, FareMatrixCell>;
  cheapestKey: string | null;
}

export function farePairKey(departureDate: string, returnDate: string) {
  return `${departureDate}|${returnDate}`;
}

export function buildFareMatrix(offers: FlightOffer[]): FareMatrix {
  const departureDates = [...new Set(offers.map((offer) => offer.departure_time.slice(0, 10)))].sort();
  const returnDates = [...new Set(offers.map((offer) => offer.return_date))].sort();
  const cells = new Map<string, FareMatrixCell>();

  for (const offer of offers) {
    const departureDate = offer.departure_time.slice(0, 10);
    const key = farePairKey(departureDate, offer.return_date);
    const current = cells.get(key);
    cells.set(key, {
      key,
      departureDate,
      returnDate: offer.return_date,
      lowestPrice: current ? Math.min(current.lowestPrice, offer.price) : offer.price,
      currency: offer.currency,
      offerCount: (current?.offerCount ?? 0) + 1,
    });
  }

  const cheapestKey = [...cells.values()].sort(
    (left, right) => left.lowestPrice - right.lowestPrice || left.key.localeCompare(right.key),
  )[0]?.key ?? null;

  return { departureDates, returnDates, cells, cheapestKey };
}
