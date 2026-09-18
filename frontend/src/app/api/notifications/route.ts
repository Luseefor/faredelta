import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/server/session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Notifications are temporarily unavailable." }, { status: 503 });
  }
}
