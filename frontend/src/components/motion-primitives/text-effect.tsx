"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type TextEffectProps = {
  children: string;
  className?: string;
  delay?: number;
  trigger?: boolean;
  style?: CSSProperties;
  onAnimationComplete?: () => void;
};

const revealTransition: Transition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1],
};

/** A restrained line reveal for display copy. Text remains a single accessible node. */
export function TextEffect({
  children,
  className,
  delay = 0,
  trigger = true,
  style,
  onAnimationComplete,
}: TextEffectProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = trigger && !prefersReducedMotion;

  return (
    <span className={cn("block overflow-hidden", className)} style={style}>
      <motion.span
        className="block will-change-transform"
        initial={shouldAnimate ? { opacity: 0, y: "0.22em" } : false}
        animate={{ opacity: trigger ? 1 : 0, y: 0 }}
        transition={{ ...revealTransition, delay }}
        onAnimationComplete={onAnimationComplete}
      >
        {children}
      </motion.span>
    </span>
  );
}
