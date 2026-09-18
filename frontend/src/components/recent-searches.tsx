"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";

import { readRecentSearches, type RecentSearch } from "@/lib/recent-searches";

export function RecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[] | null>(null);

  useEffect(() => {
    // localStorage exists only in the browser: populate after hydration so the
    // server HTML and the first client render stay identical.
    Promise.resolve()
      .then(() => readRecentSearches())
      .then(setSearches)
      .catch(() => setSearches([]));
    return undefined;
  }, []);

  if (searches === null || searches.length === 0) return null;

  return (
    <section aria-label="Recent searches" className="mx-auto mt-6 max-w-7xl px-4 sm:px-8 lg:px-10">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#102f35]/50">
        <History className="size-3.5" />Recent searches
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {searches.map((search) => (
          <li key={search.href}>
            <Link
              href={search.href}
              className="inline-flex items-center gap-2 rounded-full border border-[#102f35]/12 bg-white px-4 py-2 text-sm font-medium text-[#102f35] transition-colors hover:border-[#1b6566]/40"
            >
              {search.label}
              <span className="text-xs text-[#102f35]/45">
                {search.tripType === "one_way" ? "One way" : "Round trip"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
