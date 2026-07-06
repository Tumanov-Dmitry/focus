import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireUser } from "@/lib/auth/require-user";
import { hasSupabasePublicEnv } from "@/lib/config/env";

/**
 * Server wrapper that surfaces the current user's email for the profile menu and
 * renders content inside the shared workspace shell (rail, chrome, theme).
 */
export async function ShellPage({ children }: { children: ReactNode }) {
  let userEmail: string | undefined;
  if (hasSupabasePublicEnv()) {
    const auth = await requireUser();
    if (auth.ok) {
      userEmail = auth.user.email ?? undefined;
    }
  }

  return <WorkspaceShell userEmail={userEmail}>{children}</WorkspaceShell>;
}

export function ShellPlaceholder({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[560px] pb-32 pt-24 sm:pt-28">
      <h1 className="mb-1 text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mb-5 text-sm text-muted-foreground">Раздел в подготовке.</p>
      <div className="rounded-[20px] border border-dashed border-border/70 bg-card/40 p-10 text-center text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
