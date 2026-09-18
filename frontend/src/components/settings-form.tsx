"use client";

import { useEffect, useState } from "react";
import { Check, Settings2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadSettings, saveSettings } from "@/lib/settings";
import type { CabinClass } from "@/lib/types";

export function SettingsForm() {
  const [homeAirport, setHomeAirport] = useState("");
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [stops, setStops] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Stored settings load after hydration so SSR and first render match.
    Promise.resolve()
      .then(() => loadSettings())
      .then((current) => {
        setHomeAirport(current.homeAirport);
        setCabin(current.defaultCabin);
        setStops(String(current.defaultStops));
      })
      .catch(() => undefined);
    return undefined;
  }, []);

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const code = homeAirport.trim().toUpperCase();
    if (code !== "" && !/^[A-Z]{3}$/.test(code)) {
      setError("Home airport must be a three-letter airport code, or left blank.");
      return;
    }
    saveSettings({ homeAirport: code, defaultCabin: cabin, defaultStops: Number(stops) });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="border-white/5 bg-card/85">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="size-4" />Search defaults</h2>
        <p className="mt-1 text-sm text-muted-foreground">Stored only in this browser. Used to prefill the search form.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="home-airport">Home airport</Label>
            <Input
              id="home-airport"
              value={homeAirport}
              onChange={(event) => setHomeAirport(event.target.value.toUpperCase())}
              placeholder="e.g. ORD"
              maxLength={3}
              className="max-w-40 font-mono uppercase"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-cabin">Default cabin</Label>
              <Select value={cabin} onValueChange={(value) => setCabin(value as CabinClass)}>
                <SelectTrigger id="default-cabin"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default-stops">Default stops</Label>
              <Select value={stops} onValueChange={setStops}>
                <SelectTrigger id="default-stops"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nonstop only</SelectItem>
                  <SelectItem value="1">Up to 1 stop</SelectItem>
                  <SelectItem value="2">Up to 2 stops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button type="submit" aria-live="polite">{saved ? <><Check />Saved</> : "Save settings"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
