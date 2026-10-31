import { NextResponse } from "next/server";
import { CRON_SECRET } from "@/lib/env";
import { admin } from "@/lib/supabase/admin";
import { notifyFamily, notifyStaff } from "@/lib/push";
import { addDays, monthDay, timeText, todayVN } from "@/lib/domain";
import type { Session } from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Vercel Cron: 17:00 giờ VN mỗi ngày. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 401 });
  }

  const tomorrow = addDays(todayVN(), 1);
  let reminders = 0;

  const { data: rows } = await admin()
    .from("visit_requests")
    .select("id, code, soldier_name, session, time_from, time_to, visitor_name")
    .eq("visit_date", tomorrow)
    .eq("status", "approved");

  for (const row of rows ?? []) {
    reminders += await notifyFamily(row.id as string, {
      title: "Ngày mai đến thăm",
      body: `${row.soldier_name} · ${timeText(row)}. Mang theo phiếu ${row.code}.`,
      url: `/dang-ky/ket-qua/${row.code}`,
      tag: `dktt-nhac-${row.code}`,
    });
  }

  const { count: pending } = await admin()
    .from("visit_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if ((pending ?? 0) > 0) {
    await notifyStaff({
      title: `${pending} phiếu đang chờ duyệt`,
      body: `Còn ${pending} phiếu chưa xử lý. Vào ứng dụng để duyệt trước ngày ${monthDay(tomorrow)}.`,
      url: "/chi-huy",
      tag: "dktt-nhac-duyet",
    });
  }

  return NextResponse.json({ ok: true, reminders, pending: pending ?? 0 });
}
