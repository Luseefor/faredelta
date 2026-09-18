import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${apiUrl}/api/flights/cheap-destinations?${request.nextUrl.searchParams}`,
      { cache: "no-store" },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Cheap fares are temporarily unavailable." }, { status: 503 });
  }
}
