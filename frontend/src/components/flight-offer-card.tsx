import { Plane, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FlightOffer } from "@/lib/types";

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
function formatDuration(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }

export function FlightOfferCard({ offer }: { offer: FlightOffer }) {
  const departure = new Date(offer.departure_time); const arrival = new Date(offer.arrival_time);
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(offer.price);
  const stopLabel = offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`;
  const sourceLabel = offer.provider.includes("recently observed")
    ? "Recently observed"
    : offer.provider.includes("Mock")
      ? "Mock fare"
      : "Provider fare";
  return (
    <Card className="group overflow-hidden rounded-2xl border-[#102f35]/10 bg-white py-0 shadow-none transition-all hover:-translate-y-0.5 hover:border-[#1b6566]/35 hover:shadow-[0_16px_40px_-24px_rgba(16,47,53,.35)]">
      <CardContent className="p-0">
        <div className="grid lg:grid-cols-[220px_1fr_190px]">
          <div className="flex items-center gap-3 border-b border-[#102f35]/8 bg-[#fbfaf7] p-5 lg:border-r lg:border-b-0 lg:p-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#dce8e5] font-mono text-sm font-bold text-[#1b6566]">{offer.airline.code}</span>
            <div className="min-w-0"><p className="text-sm font-semibold leading-tight text-[#102f35]">{offer.airline.name}</p><p className="mt-1 text-xs text-[#102f35]/45">via {offer.provider}</p><Badge variant="outline" className="mt-2 border-[#102f35]/10 bg-white text-[10px] font-medium capitalize">{offer.cabin_class.replace("_", " ")}</Badge></div>
          </div>

          <div className="p-5 sm:p-6 lg:px-8">
            <p className="mb-4 text-xs font-medium text-[#102f35]/45">{dateFormatter.format(departure)} departure</p>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-7">
              <div><p className="text-xl font-semibold tracking-[-0.04em] text-[#102f35] min-[360px]:text-2xl sm:text-3xl">{timeFormatter.format(departure)}</p><p className="mt-1 text-sm font-bold text-[#102f35]">{offer.origin.code}</p></div>
              <div className="min-w-0 text-center">
                <div className="relative flex items-center"><span className="size-2 rounded-full border-2 border-[#1b6566] bg-white" /><span className="h-px flex-1 bg-[#102f35]/18" /><span className="flex size-7 items-center justify-center rounded-full bg-[#dce8e5] text-[#1b6566]"><Plane className="size-3.5 rotate-45" aria-hidden /></span><span className="h-px flex-1 bg-[#102f35]/18" /><span className="size-2 rounded-full bg-[#1b6566]" /></div>
                <div className="mt-2 flex items-center justify-center gap-1 whitespace-nowrap text-[11px] sm:gap-2 sm:text-xs"><span className="font-semibold text-[#102f35]">{formatDuration(offer.duration_minutes)}</span><span className="text-[#102f35]/25">·</span><span className={offer.stops === 0 ? "font-semibold text-[#1b6566]" : "text-[#102f35]/55"}>{stopLabel}</span></div>
              </div>
              <div className="text-right"><p className="text-xl font-semibold tracking-[-0.04em] text-[#102f35] min-[360px]:text-2xl sm:text-3xl">{timeFormatter.format(arrival)}</p><p className="mt-1 text-sm font-bold text-[#102f35]">{offer.destination.code}</p></div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#102f35]/8 bg-[#f2c94c]/12 p-5 lg:block lg:border-t-0 lg:border-l lg:p-6 lg:text-right">
            <div><p className="text-3xl font-bold tracking-[-0.05em] text-[#102f35]">{price}</p><p className="mt-1 text-xs text-[#102f35]/45">per traveler · round trip</p></div>
            <div className="mt-0 flex items-center gap-2 text-xs font-medium text-[#1b6566] lg:mt-8 lg:justify-end"><Sparkles className="size-3.5" aria-hidden />{sourceLabel}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
