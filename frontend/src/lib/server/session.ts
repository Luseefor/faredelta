import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

const ANONYMOUS_COOKIE = "faredelta_anonymous_id";

/** Clerk session token for the current browser, or null when signed out. */
export async function getSessionToken() {
  try {
    const { getToken } = await auth();
    return await getToken();
  } catch {
    // Misconfigured or unreachable Clerk degrades to anonymous instead of 500.
    return null;
  }
}

export async function getAnonymousId() {
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_COOKIE)?.value ?? null;
}

/** Backend headers for the current browser: Bearer when signed in, plus anonymous ID. */
export async function getBackendAuthHeaders() {
  const [token, anonymousId] = await Promise.all([getSessionToken(), getAnonymousId()]);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (anonymousId) headers["X-FareDelta-Anonymous-ID"] = anonymousId;
  return headers;
}
