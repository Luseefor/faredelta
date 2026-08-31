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
        y: [10, 0],
        delay: stagger(45),
        duration: 380,
        ease: "out(3)",
      });
    });

    return () => scope.revert();
  }, [sequenceKey]);

  return <div ref={root} className="space-y-4">{children}</div>;
}
