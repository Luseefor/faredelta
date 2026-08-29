import { NextResponse } from "next/server";

import { attachAnonymousCookie, getAnonymousSession } from "@/lib/server/anonymous-session";

const apiUrl = process.env.FAREDELTA_API_URL ?? "http://localhost:8000";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAnonymousSession();
  try {
    const response = await fetch(`${apiUrl}/api/tracked-routes/${id}`, {
      method: "DELETE",
      headers: { "X-FareDelta-Anonymous-ID": session.id },
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
