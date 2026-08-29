import type { FlightSearchRequest, TrackedRoute } from "@/lib/types";

async function responseOrError<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "Tracked routes are temporarily unavailable.");
  return payload as T;
}

export async function listTrackedRoutes(signal?: AbortSignal) {
  return responseOrError<TrackedRoute[]>(await fetch("/api/tracked-routes", { signal }));
}

export async function trackRoute(request: FlightSearchRequest) {
  return responseOrError<TrackedRoute>(
    await fetch("/api/tracked-routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  );
}

export async function removeTrackedRoute(id: string) {
  return responseOrError<void>(await fetch(`/api/tracked-routes/${id}`, { method: "DELETE" }));
}
