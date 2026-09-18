"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the URL itself remains shareable.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onShare} aria-live="polite">
      {copied ? <Check /> : <Link2 />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
