import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SECRET, SUPABASE_URL } from "@/lib/env";

let cached: SupabaseClient | null = null;

/** Service-role client. Server only — never import from a client component. */
export function admin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    throw new Error(
      "Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong biến môi trường.",
    );
  }
  cached ??= createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "dktt" } },
  });
  return cached;
}
