import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    supabase: Boolean(process.env.SUPABASE_URL),
    push: Boolean(process.env.VAPID_PRIVATE_KEY),
    time: new Date().toISOString(),
  });
}
