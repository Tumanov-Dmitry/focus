import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireUser } from "@/lib/auth/require-user";
import { hasSupabasePublicEnv } from "@/lib/config/env";

// Persistent shell for all workspace routes. Living in the layout means the
// rail, chrome and background stay mounted across navigations (Фокус / Задачи /
// Проекты …) — only the page content swaps, so nothing jumps.
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  let userEmail: string | undefined;
  if (hasSupabasePublicEnv()) {
    const auth = await requireUser();
    if (auth.ok) {
      userEmail = auth.user.email ?? undefined;
    }
  }

  return <WorkspaceShell userEmail={userEmail}>{children}</WorkspaceShell>;
}
