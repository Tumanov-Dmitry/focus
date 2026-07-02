import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type FocusSupabaseClient = SupabaseClient<Database>;

// Discriminated union so callers can narrow on `ok` and get a fully typed
// `user`/`supabase` without non-null assertions.
export type RequireUserResult =
  | { ok: true; user: User; supabase: FocusSupabaseClient }
  | { ok: false; error: string };

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, error: "Требуется вход в аккаунт." };
  }

  return { ok: true, user, supabase };
}
