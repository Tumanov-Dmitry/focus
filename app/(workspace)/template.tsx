"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Templates remount on every navigation, so this gives each page a soft fade-in
// while the surrounding shell (rail, chrome) stays put.
export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
