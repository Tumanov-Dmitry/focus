"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Soft cross-fade between sections while the shell (rail, chrome) stays put.
// Opacity only — transform/filter would establish a containing block and break
// the fixed-positioned elements on /today (level switcher, date, AI dock).
export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
