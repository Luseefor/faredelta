import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${apiUrl}/api/flights/history?${request.nextUrl.searchParams}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Fare history is temporarily unavailable." },
      { status: 503 },
    );
  }
}
