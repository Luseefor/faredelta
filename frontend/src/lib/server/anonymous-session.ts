import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "faredelta_anonymous_id";

export async function getAnonymousSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  return { id: existing ?? randomUUID(), isNew: !existing };
}

export function attachAnonymousCookie(response: NextResponse, id: string, isNew: boolean) {
  if (isNew) {
    response.cookies.set(COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}
