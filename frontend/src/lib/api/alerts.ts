import type { PriceAlert, PriceAlertCreate, PriceAlertUpdate } from "@/lib/types";

async function responseOrError<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "Price alerts are temporarily unavailable.");
  return payload as T;
}

export async function listPriceAlerts(signal?: AbortSignal) {
  return responseOrError<PriceAlert[]>(await fetch("/api/alerts", { signal }));
}

export async function createPriceAlert(request: PriceAlertCreate) {
  return responseOrError<PriceAlert>(
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  );
}

export async function updatePriceAlert(id: string, update: PriceAlertUpdate) {
  return responseOrError<PriceAlert>(
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),
  );
}

export async function deletePriceAlert(id: string) {
  const response = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  if (response.status === 204) return;
  const payload = await response.json();
  throw new Error(payload.detail ?? "The alert could not be deleted.");
}
