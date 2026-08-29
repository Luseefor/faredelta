import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${apiUrl}/api/flights/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "The flight search service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
