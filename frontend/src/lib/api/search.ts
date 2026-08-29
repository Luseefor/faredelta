import type { FlightSearchRequest, FlightSearchResponse } from "@/lib/types";

export async function searchFlights(
  request: FlightSearchRequest,
  signal?: AbortSignal,
): Promise<FlightSearchResponse> {
  const response = await fetch("/api/flights/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body.detail === "string" ? body.detail : null;
    throw new Error(detail ?? "We couldn't complete this search. Please try again.");
  }
  return body as FlightSearchResponse;
}
