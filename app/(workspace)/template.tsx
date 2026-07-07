"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

// Order matches the left rail, so the slide direction follows the menu: moving
// to a lower item slides the content up, to a higher item slides it down.
const RAIL_ORDER: Record<string, number> = {
  "/today": 0,
  "/inbox": 1,
  "/projects": 2,
  "/library": 3,
};

let previousIndex = 0;

export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Templates remount per navigation, so this runs once each transition.
  const [direction] = useState(() => {
    const index = RAIL_ORDER[pathname] ?? previousIndex;
    const value = index >= previousIndex ? 1 : -1;
    previousIndex = index;
    return value;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : direction * 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
