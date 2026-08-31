"use client";

import { useEffect, useRef } from "react";
import { createScope, createTimeline, stagger } from "animejs";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { TextEffect } from "@/components/motion-primitives/text-effect";

export function PremiumHero() {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!root.current || reduceMotion) return;

    const scope = createScope({ root }).add(() => {
      createTimeline({ defaults: { ease: "out(3)" } })
        .add("[data-route-line]", { scaleX: [0, 1], duration: 520 }, 180)
        .add("[data-fare-chip]", {
          opacity: [0, 1],
          y: [8, 0],
          delay: stagger(55),
          duration: 360,
        }, 360);
    });

    return () => scope.revert();
  }, [reduceMotion]);

  return (
    <div ref={root} className="grid gap-9 pb-24 pt-12 lg:grid-cols-[1.06fr_.94fr] lg:items-center lg:gap-16 lg:pb-32 lg:pt-16">
      <div className="max-w-3xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#f2c94c] backdrop-blur-sm">
          <Sparkles className="size-3.5" aria-hidden />
          Airfare intelligence, simplified
        </div>
        <h1>
            <TextEffect
              className="block text-balance text-5xl font-semibold leading-[.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]"
            >
              More dates.
            </TextEffect>
            <TextEffect
              delay={0.08}
              className="block text-balance text-5xl font-semibold leading-[.98] tracking-[-0.055em] text-[#f2c94c] sm:text-7xl lg:text-[5.5rem]"
            >
              Better fares.
            </TextEffect>
        </h1>
      </div>

      <div className="w-full min-w-0 max-w-xl pb-2 lg:justify-self-end">
        <p className="text-pretty text-lg leading-8 text-white/70 sm:text-xl">
          Search a flexible travel window and compare clean, normalized flight options without opening twelve tabs.
        </p>
        <div className="relative mt-7 overflow-hidden rounded-[1.4rem] border border-white/12 bg-white/[.065] p-5 shadow-[0_28px_90px_-38px_rgba(0,0,0,.65)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            <span>Live search model</span>
            <span className="text-[#f2c94c]">Flexible ± 3 days</span>
          </div>
          <div className="mt-5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
            <Airport code="ORD" city="Chicago" />
            <div className="relative mx-1 h-3 min-w-0" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden bg-white/20">
                <span data-route-line className="absolute inset-0 origin-left bg-[#f2c94c]/70" />
              </div>
            </div>
            <Airport code="LAX" city="Los Angeles" align="right" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <FareChip label="Cheapest" value="$228" />
            <FareChip label="Fastest" value="4h 12m" />
            <FareChip label="Best date" value="Oct 12" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/50 sm:gap-5">
          <span>Flexible dates</span><span className="size-1 rounded-full bg-[#f2c94c]" /><span>Provider neutral</span><span className="size-1 rounded-full bg-[#f2c94c]" /><span>Price history ready</span>
        </div>
      </div>
    </div>
  );
}

function Airport({ code, city, align = "left" }: { code: string; city: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="font-mono text-2xl font-semibold tracking-[-0.04em]">{code}</p>
      <p className="mt-0.5 text-[10px] text-white/40">{city}</p>
    </div>
  );
}

function FareChip({ label, value }: { label: string; value: string }) {
  return (
    <div data-fare-chip className="rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 opacity-100">
      <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white/85">{value}</p>
    </div>
  );
}
