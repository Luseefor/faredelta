"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Search, SlidersHorizontal, UsersRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AirportCombobox } from "@/components/airport-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function inputValue(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }

export function FlightSearchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const data = new FormData(event.currentTarget);
    const origin = inputValue(data, "origin").toUpperCase();
    const destination = inputValue(data, "destination").toUpperCase();
    const earliestDeparture = inputValue(data, "earliest_departure_date");
    const latestDeparture = inputValue(data, "latest_departure_date");
    const earliestReturn = inputValue(data, "earliest_return_date");
    const latestReturn = inputValue(data, "latest_return_date");
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) { setError("Enter valid three-letter airport codes for both airports."); return; }
    if (origin === destination) { setError("Origin and destination airports must be different."); return; }
    if (!earliestDeparture || !latestDeparture || !earliestReturn || !latestReturn) { setError("Choose all four dates to search a flexible travel window."); return; }
    if (earliestDeparture > latestDeparture || earliestReturn > latestReturn) { setError("Each earliest date must be on or before its latest date."); return; }
    if (earliestReturn <= earliestDeparture || latestReturn <= latestDeparture) { setError("Your return window must be after your departure window."); return; }
    const params = new URLSearchParams({ origin, destination, earliest_departure_date: earliestDeparture, latest_departure_date: latestDeparture, earliest_return_date: earliestReturn, latest_return_date: latestReturn, travelers: inputValue(data, "travelers"), cabin_class: inputValue(data, "cabin_class"), maximum_stops: inputValue(data, "maximum_stops") });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#102f35]/8 bg-white shadow-[0_24px_70px_-34px_rgba(16,47,53,.42)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#102f35]/8 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#102f35] px-3 py-1.5 text-xs font-semibold text-white">Round trip</span>
          <span className="hidden text-xs text-[#102f35]/50 sm:inline">Search across flexible dates</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1b6566]"><SlidersHorizontal className="size-3.5" /> Flexible filters</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-5 lg:p-6">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3">
          <AirportCombobox name="origin" label="Flying from" placeholder="Choose origin" />
          </div>
          <div className="lg:col-span-3">
          <AirportCombobox name="destination" label="Flying to" placeholder="Choose destination" />
          </div>
          <div className="lg:col-span-3">
          <DateWindow title="Departure window" prefix="departure" />
          </div>
          <div className="lg:col-span-3">
          <DateWindow title="Return window" prefix="return" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-12">
          <div className="lg:col-span-2">
          <SelectField icon={UsersRound} name="travelers" label="Travelers" defaultValue="1">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => <SelectItem key={count} value={String(count)}>{count} {count === 1 ? "traveler" : "travelers"}</SelectItem>)}
          </SelectField>
          </div>
          <div className="lg:col-span-2">
          <SelectField icon={SlidersHorizontal} name="cabin_class" label="Cabin" defaultValue="economy">
            <SelectItem value="economy">Economy</SelectItem><SelectItem value="premium_economy">Premium economy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="first">First</SelectItem>
          </SelectField>
          </div>
          <div className="lg:col-span-2">
          <SelectField icon={MapPin} name="maximum_stops" label="Stops" defaultValue="1">
            <SelectItem value="0">Nonstop only</SelectItem><SelectItem value="1">Up to 1 stop</SelectItem><SelectItem value="2">Up to 2 stops</SelectItem>
          </SelectField>
          </div>
          <p className="self-center text-[11px] leading-5 text-[#102f35]/48 sm:col-span-3 lg:col-span-3">Fare availability and pricing are provided by connected travel data partners.</p>
          <Button type="submit" size="lg" className="h-full min-h-14 rounded-2xl bg-[#f2c94c] px-5 font-bold text-[#102f35] shadow-none hover:bg-[#e8bc37] sm:col-span-3 lg:col-span-3">
            <Search className="size-4" aria-hidden /> Search flexible dates <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>

        {error ? <Alert variant="destructive" role="alert" className="mt-5"><AlertTitle>Check your search</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      </form>
    </div>
  );
}

function DateWindow({ title, prefix }: { title: string; prefix: "departure" | "return" }) {
  return <fieldset className="h-full rounded-2xl border border-[#102f35]/12 bg-[#fbfaf7] p-3.5">
    <legend className="sr-only">{title}</legend>
    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#102f35]/55"><CalendarDays className="size-3.5 text-[#1b6566]" />{title}</div>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      <DateField id={`earliest_${prefix}_date`} label="Earliest" />
      <ArrowRight className="mt-4 size-3.5 text-[#102f35]/30" aria-hidden />
      <DateField id={`latest_${prefix}_date`} label="Latest" />
    </div>
  </fieldset>;
}

function DateField({ id, label }: { id: string; label: string }) {
  return <div className="min-w-0"><Label htmlFor={id} className="text-[10px] text-[#102f35]/50">{label}</Label><Input id={id} name={id} type="date" required className="mt-0.5 h-8 min-w-0 max-w-full border-0 bg-transparent px-0 text-[11px] font-semibold shadow-none focus-visible:ring-0" /></div>;
}

function SelectField({ icon: Icon, name, label, defaultValue, children }: { icon: typeof MapPin; name: string; label: string; defaultValue: string; children: React.ReactNode }) {
  return <div className="h-full rounded-2xl border border-[#102f35]/12 bg-[#fbfaf7] p-3.5"><Label htmlFor={name} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#102f35]/55"><Icon className="size-3.5 text-[#1b6566]" />{label}</Label><Select name={name} defaultValue={defaultValue}><SelectTrigger id={name} className="mt-1 h-7 w-full border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div>;
}
