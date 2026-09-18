import type { CheapDestinationsResponse } from "@/lib/types";

export async function getCheapDestinations(
  origin: string,
  signal?: AbortSignal,
  departDate?: string,
  returnDate?: string,
): Promise<CheapDestinationsResponse> {
  const params = new URLSearchParams({ origin });
  if (departDate) params.set("depart_date", departDate);
  if (returnDate) params.set("return_date", returnDate);

  const response = await fetch(`/api/flights/cheap-destinations?${params}`, { signal });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? "Cheap fares could not be loaded.");
  }
  return payload as CheapDestinationsResponse;
}
