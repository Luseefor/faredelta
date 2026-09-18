import type { TripType } from "./types";

export interface RecentSearch {
  href: string;
  origin: string;
  destination: string;
  tripType: TripType;
  label: string;
  searchedAt: string;
}

const STORAGE_KEY = "faredelta:recent-searches";
const MAX_SAVED = 6;

export function readRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry?.href === "string" && typeof entry?.label === "string")
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

export function recordSearch(entry: Omit<RecentSearch, "searchedAt">): RecentSearch[] {
  const next = [
    { ...entry, searchedAt: new Date().toISOString() },
    ...readRecentSearches().filter((item) => item.href !== entry.href),
  ].slice(0, MAX_SAVED);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing and quota errors keep the session working.
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
