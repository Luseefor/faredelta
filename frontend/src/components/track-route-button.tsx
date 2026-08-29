"use client";

import { useState } from "react";
import Link from "next/link";
import { BellPlus, Check, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackRoute } from "@/lib/api/tracked-routes";
import type { FlightSearchRequest } from "@/lib/types";

export function TrackRouteButton({ request }: { request: FlightSearchRequest }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (state === "saved") {
    return (
      <Button asChild variant="outline" size="sm" className="border-primary/25 text-primary">
        <Link href="/tracked"><Check /> Saved — view tracking</Link>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={state === "saving"}
      onClick={() => {
        setState("saving");
        trackRoute(request).then(() => setState("saved")).catch(() => setState("error"));
      }}
      className={state === "error" ? "border-destructive/40 text-destructive" : ""}
    >
      {state === "saving" ? <LoaderCircle className="animate-spin" /> : <BellPlus />}
      {state === "error" ? "Try saving again" : "Track this route"}
    </Button>
  );
}
