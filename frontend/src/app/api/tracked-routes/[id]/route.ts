import { NextResponse } from "next/server";

import { attachAnonymousCookie, getAnonymousSession } from "@/lib/server/anonymous-session";
import { getSessionToken } from "@/lib/server/session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAnonymousSession();
  const token = await getSessionToken();
  try {
    const response = await fetch(`${apiUrl}/api/tracked-routes/${id}`, {
      headers: {
        "X-FareDelta-Anonymous-ID": session.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    const result = NextResponse.json(await response.json(), { status: response.status });
    return attachAnonymousCookie(result, session.id, session.isNew);
  } catch {
    return NextResponse.json({ detail: "The route could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAnonymousSession();
  const token = await getSessionToken();
  try {
    const response = await fetch(`${apiUrl}/api/tracked-routes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-FareDelta-Anonymous-ID": session.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const result = NextResponse.json(await response.json(), { status: response.status });
    return attachAnonymousCookie(result, session.id, session.isNew);
  } catch {
    return NextResponse.json({ detail: "The route could not be updated." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAnonymousSession();
  const token = await getSessionToken();
  try {
    const response = await fetch(`${apiUrl}/api/tracked-routes/${id}`, {
      method: "DELETE",
      headers: {
        "X-FareDelta-Anonymous-ID": session.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    const result = response.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(await response.json(), { status: response.status });
    return attachAnonymousCookie(result, session.id, session.isNew);
  } catch {
    return NextResponse.json({ detail: "The route could not be removed." }, { status: 503 });
  }
}
