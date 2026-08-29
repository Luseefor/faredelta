import { ResultsSkeleton } from "@/components/flight-results";

export default function Loading() {
  return <main className="min-h-screen bg-slate-50 px-4 py-24 sm:px-6"><div className="mx-auto max-w-6xl"><ResultsSkeleton /></div></main>;
}
