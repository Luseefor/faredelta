"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, stagger } from "animejs";

export function AnimeStagger({ children, sequenceKey }: { children: ReactNode; sequenceKey: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scope = createScope({ root }).add(() => {
      animate("[data-stagger-item]", {
        opacity: [0, 1],
        y: [22, 0],
        scale: [0.985, 1],
        delay: stagger(65),
        duration: 620,
        ease: "out(4)",
      });
    });

    return () => scope.revert();
  }, [sequenceKey]);

  return <div ref={root} className="space-y-4">{children}</div>;
}
