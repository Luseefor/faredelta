import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/server/session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to use price alerts." }, { status: 401 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "The alert could not be updated." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Sign in to use price alerts." }, { status: 401 });
  }
  try {
    const response = await fetch(`${apiUrl}/api/alerts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: "The alert could not be deleted." }, { status: 503 });
  }
}
