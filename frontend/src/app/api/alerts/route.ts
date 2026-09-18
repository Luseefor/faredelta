import { NextRequest, NextResponse } from "next/server";

import { getSessionToken } from "@/lib/server/session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to use price alerts." }, { status: 401 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Price alerts are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to use price alerts." }, { status: 401 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "The alert could not be saved." }, { status: 503 });
  }
}
