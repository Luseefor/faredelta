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
    <div className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_24px_80px_-28px_rgba(16,47,53,.35)]">
      <div className="flex flex-col gap-4 border-b border-[#102f35]/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#102f35] px-4 py-2 text-sm font-semibold text-white">Round trip</span>
          <span className="text-sm text-[#102f35]/50">Search across flexible dates</span>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[#1b6566]"><SlidersHorizontal className="size-3.5" /> Smart filters included</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 lg:p-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <AirportCombobox name="origin" label="Flying from" placeholder="Choose origin" />
          <AirportCombobox name="destination" label="Flying to" placeholder="Choose destination" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DateWindow title="Departure window" prefix="departure" />
          <DateWindow title="Return window" prefix="return" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SelectField icon={UsersRound} name="travelers" label="Travelers" defaultValue="1">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => <SelectItem key={count} value={String(count)}>{count} {count === 1 ? "traveler" : "travelers"}</SelectItem>)}
          </SelectField>
          <SelectField icon={SlidersHorizontal} name="cabin_class" label="Cabin" defaultValue="economy">
            <SelectItem value="economy">Economy</SelectItem><SelectItem value="premium_economy">Premium economy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="first">First</SelectItem>
          </SelectField>
          <SelectField icon={MapPin} name="maximum_stops" label="Stops" defaultValue="1">
            <SelectItem value="0">Nonstop only</SelectItem><SelectItem value="1">Up to 1 stop</SelectItem><SelectItem value="2">Up to 2 stops</SelectItem>
          </SelectField>
        </div>

        {error ? <Alert variant="destructive" role="alert" className="mt-5"><AlertTitle>Check your search</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="mt-6 flex flex-col gap-4 border-t border-[#102f35]/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-xs leading-5 text-[#102f35]/45">Mock fares are generated for this first release. No booking or payment information is collected.</p>
          <Button type="submit" size="lg" className="h-13 rounded-xl bg-[#f2c94c] px-7 font-bold text-[#102f35] shadow-none hover:bg-[#e8bc37]">
            <Search className="size-4" aria-hidden /> Search flexible dates <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}

function DateWindow({ title, prefix }: { title: string; prefix: "departure" | "return" }) {
  return <fieldset className="rounded-2xl border border-[#102f35]/12 bg-[#fbfaf7] p-4">
    <legend className="sr-only">{title}</legend>
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#102f35]/50"><CalendarDays className="size-3.5 text-[#1b6566]" />{title}</div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <DateField id={`earliest_${prefix}_date`} label="Earliest" />
      <ArrowRight className="mt-5 size-4 text-[#102f35]/25" aria-hidden />
      <DateField id={`latest_${prefix}_date`} label="Latest" />
    </div>
  </fieldset>;
}

function DateField({ id, label }: { id: string; label: string }) {
  return <div><Label htmlFor={id} className="text-xs text-[#102f35]/45">{label}</Label><Input id={id} name={id} type="date" required className="mt-1 h-9 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0" /></div>;
}

function SelectField({ icon: Icon, name, label, defaultValue, children }: { icon: typeof MapPin; name: string; label: string; defaultValue: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#102f35]/12 bg-[#fbfaf7] p-4"><Label htmlFor={name} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#102f35]/50"><Icon className="size-3.5 text-[#1b6566]" />{label}</Label><Select name={name} defaultValue={defaultValue}><SelectTrigger id={name} className="mt-1 h-8 w-full border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div>;
}
