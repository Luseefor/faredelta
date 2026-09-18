"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/** Adopt anonymous tracked routes into the account right after sign in. Idempotent. */
export function ClerkSync() {
  const { isSignedIn } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || synced.current) return;
    synced.current = true;
    fetch("/api/auth/claim", { method: "POST" }).catch(() => undefined);
  }, [isSignedIn]);

  return null;
}
