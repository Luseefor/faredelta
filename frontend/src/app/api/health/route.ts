import { NextResponse } from "next/server";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: "unavailable", detail: "FareDelta API is unreachable." },
      { status: 503 },
    );
  }
}
