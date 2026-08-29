"use client";
import { ResultState } from "@/components/result-state";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-24"><div className="mx-auto max-w-3xl"><ResultState kind="error" title="Something went wrong" message="FareDelta hit an unexpected error. Your search details are safe to try again." onRetry={reset} /></div></main>;
}
