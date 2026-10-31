export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

export const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "";

export const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? "mailto:daidoi5@example.com";

export const CRON_SECRET = process.env.CRON_SECRET ?? "";

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_SECRET);
