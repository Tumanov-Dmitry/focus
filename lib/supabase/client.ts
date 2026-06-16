import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(url, anonKey);
}
