import type { User } from "@/lib/types";

export async function fetchCurrentUser(signal?: AbortSignal) {
  const response = await fetch("/api/auth/me", { signal });
  if (response.status === 401) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "Authentication failed.");
  return payload as User;
}

/** Adopt this browser's anonymous tracked routes into the signed-in account. */
export async function claimAnonymousRoutes() {
  const response = await fetch("/api/auth/claim", { method: "POST" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "Could not claim tracked routes.");
  return payload as { claimed: number };
}
