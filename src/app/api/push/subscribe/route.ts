import { NextResponse } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { supa } from "@/lib/supabase/server";

const body = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }),
  audience: z.enum(["staff", "family"]),
  requestCode: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { endpoint, keys, audience, requestCode } = parsed.data;

  let staffId: string | null = null;
  let requestId: string | null = null;

  if (audience === "staff") {
    const sb = await supa();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    staffId = user.id;
  } else {
    if (!requestCode) {
      return NextResponse.json({ error: "Thiếu mã phiếu." }, { status: 400 });
    }
    const { data } = await admin()
      .from("visit_requests")
      .select("id")
      .eq("code", requestCode.toUpperCase())
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Không thấy phiếu." }, { status: 404 });
    requestId = data.id as string;
  }

  const { error } = await admin()
    .from("push_subscriptions")
    .upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        audience,
        staff_id: staffId,
        request_id: requestId,
        user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return NextResponse.json({ error: "Không lưu được đăng ký." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { endpoint } = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
  };
  if (!endpoint) return NextResponse.json({ error: "Thiếu endpoint." }, { status: 400 });
  await admin().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
