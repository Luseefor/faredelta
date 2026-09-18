import { describe, expect, it, vi } from "vitest";

import { clearRecentSearches, readRecentSearches, recordSearch } from "./recent-searches";
import { loadSettings, saveSettings } from "./settings";

describe("recent searches", () => {
  it("dedupes, caps, and clears history", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });

    expect(readRecentSearches()).toEqual([]);
    for (let index = 0; index < 8; index += 1) {
      recordSearch({
        href: `/search?origin=AA${index}`,
        origin: `AA${index}`,
        destination: "LAX",
        tripType: "round_trip",
        label: `AA${index} → LAX`,
      });
    }
    const saved = readRecentSearches();
    expect(saved.length).toBe(6);
    expect(saved[0].href).toContain("AA7");

    recordSearch({ href: saved[5].href, origin: "x", destination: "y", tripType: "one_way", label: "again" });
    expect(readRecentSearches()[0].label).toBe("again");

    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe("settings", () => {
  it("validates stored values and falls back to defaults", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });

    expect(loadSettings()).toEqual({ homeAirport: "", defaultCabin: "economy", defaultStops: 1 });

    saveSettings({ homeAirport: "ord", defaultCabin: "business", defaultStops: 2 });
    expect(loadSettings()).toEqual({ homeAirport: "ORD", defaultCabin: "business", defaultStops: 2 });

    store.set("faredelta:settings", JSON.stringify({ homeAirport: "XX", defaultCabin: "luxury", defaultStops: 9 }));
    expect(loadSettings()).toEqual({ homeAirport: "", defaultCabin: "economy", defaultStops: 1 });

    store.set("faredelta:settings", "not-json");
    expect(loadSettings().homeAirport).toBe("");
    vi.unstubAllGlobals();
  });
});
