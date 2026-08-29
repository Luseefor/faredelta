"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, LoaderCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { airportTypeLabel, type AirportOption } from "@/lib/airports";
import { cn } from "@/lib/utils";

export function AirportCombobox({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [selected, setSelected] = useState<AirportOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/airports?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Airport search failed");
          return response.json() as Promise<{ airports: AirportOption[] }>;
        })
        .then((body) => setOptions(body.airports))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([]);
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, query ? 150 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setLoading(true);
    else setQuery("");
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setLoading(true);
  }

  return (
    <div className="rounded-2xl border border-[#102f35]/12 bg-[#fbfaf7] p-4 transition-colors focus-within:border-[#1b6566]">
      <Label id={`${name}-label`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#102f35]/50"><MapPin className="size-3.5 text-[#1b6566]" aria-hidden />{label}</Label>
      <input type="hidden" name={name} value={selected?.code ?? ""} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" role="combobox" aria-expanded={open} aria-labelledby={`${name}-label ${name}-value`} className="mt-1 h-auto w-full justify-between px-0 py-0 text-left hover:bg-transparent">
            <span id={`${name}-value`} className="min-w-0">{selected ? <><span className="block text-2xl font-semibold tracking-[-0.03em] text-[#102f35]">{selected.city} <span className="text-[#1b6566]">{selected.code}</span></span><span className="mt-0.5 block truncate text-xs font-normal text-[#102f35]/45">{selected.name} · {selected.country}</span></> : <span className="text-2xl font-semibold tracking-[-0.03em] text-[#102f35]/20">{placeholder}</span>}</span>
            <ChevronsUpDown className="ml-3 size-4 shrink-0 text-[#102f35]/35" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(30rem,calc(100vw-2.5rem))] p-1">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={handleQueryChange} placeholder="Search city, airport, country, or code…" />
            <CommandList>
              {loading ? <div className="flex items-center justify-center gap-2 py-7 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden />Searching airports…</div> : null}
              {!loading && options.length === 0 ? <CommandEmpty>No matching airport found.</CommandEmpty> : null}
              {!loading && options.length > 0 ? (
                <CommandGroup heading={query ? "Best matches" : "Popular airports"}>
                  {options.map((airport) => (
                    <CommandItem key={airport.code} value={airport.code} data-checked={selected?.code === airport.code} onSelect={() => { setSelected(airport); setOpen(false); setQuery(""); }} className="gap-3 py-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#dce8e5] font-mono text-xs font-bold text-[#1b6566]">{airport.code}</span>
                      <span className="min-w-0 flex-1"><span className="block font-medium">{airport.city}{airport.region ? `, ${airport.region}` : ""}</span><span className="block truncate text-xs text-muted-foreground">{airport.name} · {airport.country}</span></span>
                      <span className="hidden text-[10px] text-muted-foreground sm:block">{airportTypeLabel(airport.type)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className={cn("mt-2 text-[11px] text-[#102f35]/38", selected && "sr-only")}>Search more than 9,000 airports worldwide</p>
    </div>
  );
}
