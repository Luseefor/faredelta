"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import type { ReactNode } from "react";

export type InViewProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
};

const transition: Transition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
};

/** A small, one-time entrance intended for section-level hierarchy only. */
export function InView({ children, className, delay = 0, once = true }: InViewProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ ...transition, delay }}
    >
      {children}
    </motion.div>
  );
}
