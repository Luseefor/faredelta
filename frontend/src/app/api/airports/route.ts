import { NextRequest, NextResponse } from "next/server";

import { airportCount, searchAirports } from "@/lib/airport-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  return NextResponse.json({ airports: searchAirports(query), total: airportCount() });
}
