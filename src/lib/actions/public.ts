"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { notifyStaff } from "@/lib/push";
import {
  SESSIONS,
  addDays,
  isWeekend,
  monthDay,
  nowHourVN,
  todayVN,
  weekdayShort,
  type Session,
} from "@/lib/domain";
import type { FormState } from "@/lib/form";

const phone = z
  .string()
  .trim()
  .regex(/^0\d{8,10}$/, "Số điện thoại không hợp lệ (VD: 0912345678)");

const base = z.object({
  soldierId: z.string().uuid("Chọn quân nhân được thăm"),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày đến thăm"),
  session: z.enum(["sang", "chieu"]),
  visitorName: z.string().trim().min(2, "Nhập họ tên người đến thăm").max(60),
  relation: z.string().trim().min(1, "Chọn quan hệ với quân nhân").max(30),
  phone,
  idCard: z.string().trim().max(20).optional(),
  address: z.string().trim().max(160).optional(),
  companions: z.coerce.number().int().min(1).max(8),
  companionNames: z.string().trim().max(160).optional(),
  purpose: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
  urgentReason: z.string().trim().max(400).optional(),
});

function fail(message: string): FormState {
  return { error: message };
}

export async function submitVisit(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  const kind = fd.get("kind") === "urgent" ? "urgent" : "weekend";

  // Bẫy bot: trường ẩn phải để trống.
  if (fd.get("website")) return { ok: true, code: "" };

  const parsed = base.safeParse({
    soldierId: fd.get("soldierId"),
    visitDate: fd.get("visitDate"),
    session: fd.get("session"),
    visitorName: fd.get("visitorName"),
    relation: fd.get("relation"),
    phone: fd.get("phone"),
    idCard: fd.get("idCard") ?? undefined,
    address: fd.get("address") ?? undefined,
    companions: fd.get("companions") ?? 1,
    companionNames: fd.get("companionNames") ?? undefined,
    purpose: fd.get("purpose") ?? undefined,
    note: fd.get("note") ?? undefined,
    urgentReason: fd.get("urgentReason") ?? undefined,
  });

  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[String(issue.path[0])] ??= issue.message;
    }
    return { error: "Vui lòng kiểm tra lại các ô được đánh dấu.", fields };
  }

  const v = parsed.data;
  const today = todayVN();

  if (kind === "weekend") {
    if (!isWeekend(v.visitDate)) return fail("Ngày tiếp thân nhân là thứ Bảy hoặc Chủ nhật.");
    if (v.visitDate < today) return fail("Ngày đã qua.");
    if (v.visitDate > addDays(today, 28)) return fail("Chỉ mở đăng ký trong 4 tuần tới.");
    // Sổ đăng ký ngày mai đóng lúc 20:00 hôm nay.
    if (v.visitDate === addDays(today, 1) && nowHourVN() >= 20) {
      return fail("Đã quá 20:00, không nhận đăng ký cho ngày mai.");
    }
  } else {
    if (v.visitDate < today) return fail("Ngày đã qua.");
    if (v.visitDate > addDays(today, 2)) return fail("Đăng ký đột xuất chỉ nhận trong 3 ngày tới.");
    if (!v.urgentReason || v.urgentReason.length < 10) {
      return fail("Nêu rõ lý do đột xuất (ít nhất 10 ký tự) để chỉ huy xét duyệt.");
    }
  }

  const settings = await getSettings();

  const { data: soldier } = await admin()
    .from("soldiers")
    .select("id, full_name, rank, class_id, squad_id, active")
    .eq("id", v.soldierId)
    .maybeSingle();

  if (!soldier || !soldier.active) return fail("Không tìm thấy quân nhân trong danh sách.");

  // Ngày bị tạm dừng tiếp (toàn đơn vị hoặc theo lớp).
  const { data: closures } = await admin()
    .from("notices")
    .select("title, class_ids")
    .eq("kind", "closure")
    .eq("active", true)
    .lte("start_date", v.visitDate)
    .gte("end_date", v.visitDate);

  const blocked = (closures ?? []).find(
    (n) =>
      !n.class_ids?.length ||
      (soldier.class_id && n.class_ids.includes(soldier.class_id)),
  );
  if (blocked) return fail(`Ngày này đơn vị tạm dừng tiếp: ${blocked.title}.`);

  // Sức chứa.
  const { count } = await admin()
    .from("visit_requests")
    .select("id", { count: "exact", head: true })
    .eq("visit_date", v.visitDate)
    .eq("session", v.session)
    .in("status", kind === "urgent" ? ["approved", "checked_in", "pending"] : ["approved", "checked_in"]);

  const cap = kind === "urgent" ? settings.capacity.urgent : settings.capacity.weekend;
  if ((count ?? 0) >= cap) {
    return fail(
      kind === "urgent"
        ? "Đã hết suất đột xuất cho ngày này. Liên hệ trực ban đại đội."
        : `Buổi ${SESSIONS[v.session as Session].label.toLowerCase()} ngày ${monthDay(v.visitDate)} đã đủ ${cap} lượt.`,
    );
  }

  // Mỗi số điện thoại: 1 phiếu/ngày, tối đa 5 lượt gửi/ngày.
  const { data: dup } = await admin()
    .from("visit_requests")
    .select("code")
    .eq("phone", v.phone)
    .eq("visit_date", v.visitDate)
    .in("status", ["pending", "approved", "checked_in"])
    .maybeSingle();
  if (dup) return fail(`Số điện thoại này đã có phiếu cho ngày ${monthDay(v.visitDate)} (${dup.code}).`);

  const { count: recent } = await admin()
    .from("visit_requests")
    .select("id", { count: "exact", head: true })
    .eq("phone", v.phone)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((recent ?? 0) >= 5) return fail("Số điện thoại này đã gửi quá nhiều phiếu trong 24 giờ.");

  const { data: created, error } = await admin()
    .from("visit_requests")
    .insert({
      kind,
      soldier_id: soldier.id,
      soldier_name: soldier.full_name,
      soldier_rank: soldier.rank,
      class_id: soldier.class_id,
      squad_id: soldier.squad_id,
      visit_date: v.visitDate,
      session: v.session,
      visitor_name: v.visitorName,
      relation: v.relation,
      phone: v.phone,
      id_card: v.idCard || null,
      address: v.address || null,
      companions: v.companions,
      companion_names: v.companionNames || null,
      purpose: v.purpose || null,
      note: v.note || null,
      urgent_reason: kind === "urgent" ? v.urgentReason || null : null,
    })
    .select("id, code")
    .single();

  if (error || !created) {
    return fail("Chưa gửi được phiếu. Vui lòng thử lại sau ít phút.");
  }

  await notifyStaff({
    title: kind === "urgent" ? "Đơn đột xuất mới" : "Phiếu đăng ký mới",
    body: `${v.visitorName} (${v.relation}) · ${soldier.full_name} · ${weekdayShort(
      v.visitDate,
    )} ${monthDay(v.visitDate)} · ${SESSIONS[v.session as Session].label}`,
    url: "/chi-huy",
    tag: "dktt-don-moi",
  });

  redirect(`/phieu/${created.code}?moi=1`);
}

export async function lookupVisit(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const tail = String(fd.get("phoneTail") ?? "").replace(/\D/g, "");

  if (!code || tail.length < 3) {
    return { error: "Nhập mã phiếu và 3 số cuối điện thoại đã dùng khi đăng ký." };
  }

  const { data } = await admin()
    .from("visit_requests")
    .select("code, phone")
    .eq("code", code)
    .maybeSingle();

  if (!data) return { error: "Không thấy phiếu với mã này." };
  if (!(data.phone as string).replace(/\D/g, "").endsWith(tail)) {
    return { error: "Số điện thoại không khớp với phiếu." };
  }
  redirect(`/phieu/${data.code}?moi=1`);
}
