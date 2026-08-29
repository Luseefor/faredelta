import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buildFareMatrix, farePairKey } from "@/lib/flexible-date-matrix";
import { cn } from "@/lib/utils";
import type { FlightOffer } from "@/lib/types";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function price(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function FlexibleDateMatrix({
  offers,
  selectedPair,
  onSelectPair,
}: {
  offers: FlightOffer[];
  selectedPair: string | null;
  onSelectPair: (pair: string | null) => void;
}) {
  const matrix = buildFareMatrix(offers);

  if (matrix.departureDates.length < 2 && matrix.returnDates.length < 2) return null;

  return (
    <Card className="border-white/5 bg-card/80 shadow-[0_20px_70px_-45px_rgba(32,211,174,0.45)]">
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Flexible-date fares</h2>
            <Badge variant="secondary">Lowest round-trip price</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare departure and return combinations. Select a fare to view its flight.
          </p>
        </div>
        {selectedPair && (
          <Button variant="ghost" size="sm" onClick={() => onSelectPair(null)}>
            Show all dates
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Lowest fares by departure and return date</caption>
            <thead>
              <tr className="bg-muted/45">
                <th className="min-w-32 border-b border-r border-border/70 p-3 text-left font-medium text-muted-foreground">
                  Depart ↓ / Return →
                </th>
                {matrix.returnDates.map((returnDate) => (
                  <th key={returnDate} className="border-b border-border/70 p-3 text-center font-medium">
                    <span className="block text-xs text-muted-foreground">Return</span>
                    {shortDate(returnDate)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.departureDates.map((departureDate) => (
                <tr key={departureDate}>
                  <th className="border-r border-t border-border/70 bg-muted/20 p-3 text-left font-medium first:border-t-0">
                    <span className="block text-xs text-muted-foreground">Depart</span>
                    {shortDate(departureDate)}
                  </th>
                  {matrix.returnDates.map((returnDate) => {
                    const key = farePairKey(departureDate, returnDate);
                    const cell = matrix.cells.get(key);
                    const selected = selectedPair === key;
                    const cheapest = matrix.cheapestKey === key;
                    return (
                      <td key={returnDate} className="border-t border-border/70 p-1.5 text-center first:border-t-0">
                        {cell ? (
                          <button
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${shortDate(departureDate)} departure, ${shortDate(returnDate)} return, ${price(cell.lowestPrice, cell.currency)}`}
                            onClick={() => onSelectPair(selected ? null : key)}
                            className={cn(
                              "relative min-h-16 w-full rounded-lg px-3 py-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              "hover:bg-primary/10 hover:text-primary",
                              cheapest && "bg-primary/10 text-primary",
                              selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                            )}
                          >
                            {price(cell.lowestPrice, cell.currency)}
                            {cheapest && (
                              <span className={cn("block text-[10px] font-medium uppercase tracking-wide", selected ? "text-primary-foreground/75" : "text-primary/75")}>
                                Best fare
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/45">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
