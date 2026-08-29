import { NextRequest, NextResponse } from "next/server";

import { attachAnonymousCookie, getAnonymousSession } from "@/lib/server/anonymous-session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

async function proxy(method: "GET" | "POST", request?: NextRequest) {
  const session = await getAnonymousSession();
  try {
    const response = await fetch(`${apiUrl}/api/tracked-routes`, {
      method,
      headers: {
        "X-FareDelta-Anonymous-ID": session.id,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" && request ? JSON.stringify(await request.json()) : undefined,
      cache: "no-store",
    });
    const payload = await response.json();
    return attachAnonymousCookie(
      NextResponse.json(payload, { status: response.status }),
      session.id,
      session.isNew,
    );
  } catch {
    return NextResponse.json({ detail: "Tracked routes are temporarily unavailable." }, { status: 503 });
  }
}

export async function GET() {
  return proxy("GET");
}

export async function POST(request: NextRequest) {
  return proxy("POST", request);
}
