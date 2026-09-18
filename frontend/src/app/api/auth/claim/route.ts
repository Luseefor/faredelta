import { NextResponse } from "next/server";

import { getAnonymousId, getSessionToken } from "@/lib/server/session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

/** Adopt this browser's anonymous tracked routes into the signed-in account. Idempotent. */
export async function POST() {
  const [token, anonymousId] = await Promise.all([getSessionToken(), getAnonymousId()]);
  if (!token) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  if (!anonymousId) {
    return NextResponse.json({ claimed: 0 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/auth/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ anonymous_id: anonymousId }),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}
