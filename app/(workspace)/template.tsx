"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Templates remount on every navigation, so this gives each section a clear,
// premium enter animation while the surrounding shell (rail, chrome) stays put.
export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.97, y: 12, filter: "blur(8px)" }
      }
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: reduceMotion ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
