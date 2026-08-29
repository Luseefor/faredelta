import type { FareHistoryResponse } from "@/lib/types";

export async function getFareHistory(
  origin: string,
  destination: string,
  signal?: AbortSignal,
  departureDate?: string,
  returnDate?: string,
): Promise<FareHistoryResponse> {
  const params = new URLSearchParams({ origin, destination });
  if (departureDate) params.set("departure_date", departureDate);
  if (returnDate) params.set("return_date", returnDate);

  const response = await fetch(`/api/flights/history?${params}`, { signal });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? "Fare history could not be loaded.");
  }
  return payload as FareHistoryResponse;
}
