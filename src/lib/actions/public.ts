"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data";
import { notifyStaff } from "@/lib/push";
import { RESULT_COOKIE, RESULT_COOKIE_OPTIONS } from "@/lib/session";
import {
  addDays,
  diffDays,
  isWeekend,
  monthDay,
  nowTimeVN,
  timeText,
  toMinutes,
  todayVN,
  weekdayShort,
} from "@/lib/domain";
import type { FormState } from "@/lib/form";

const phone = z
  .string()
  .trim()
  .regex(/^0\d{8,10}$/, "Số điện thoại không hợp lệ (VD: 0912345678)");

const time = z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ");

const base = z.object({
  soldierId: z.string().uuid("Chọn quân nhân được thăm"),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày đến thăm"),
  timeFrom: time,
  timeTo: time,
  visitorName: z.string().trim().min(2, "Nhập họ tên người đến thăm").max(60),
  relation: z.string().trim().min(1, "Chọn quan hệ với quân nhân").max(30),
  phone,
  idCard: z.string().trim().max(20).optional(),
  address: z.string().trim().max(160).optional(),
  companions: z.coerce.number().int().min(1, "Ít nhất 1 người").max(200),
  companionNames: z.string().trim().max(300).optional(),
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

  if (fd.get("website")) return { ok: true, code: "" };

  const parsed = base.safeParse({
    soldierId: fd.get("soldierId"),
    visitDate: fd.get("visitDate"),
    timeFrom: fd.get("timeFrom"),
    timeTo: fd.get("timeTo"),
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
  const settings = await getSettings();
  const window = settings.visitWindow;

  if (kind === "weekend") {
    if (!isWeekend(v.visitDate)) return fail("Ngày tiếp thân nhân là thứ Bảy hoặc Chủ nhật.");
    if (v.visitDate < today) return fail("Ngày đã qua.");
    if (v.visitDate > addDays(today, 28)) return fail("Chỉ mở đăng ký trong 4 tuần tới.");
    // Đơn vị cần chốt cơm và chuẩn bị trước, nên phải báo trước vài ngày.
    if (diffDays(today, v.visitDate) < settings.minLeadDays) {
      return fail(
        `Cần đăng ký trước ${settings.minLeadDays} ngày để đơn vị chuẩn bị.`,
      );
    }
  } else {
    // Đơn đột xuất: xin gặp ngoài lịch cuối tuần, chọn ngày bất kỳ trong 2 tuần tới.
    if (v.visitDate < today) return fail("Ngày đã qua.");
    if (v.visitDate > addDays(today, 14)) {
      return fail("Đơn đột xuất chỉ nhận trong 2 tuần tới.");
    }
    if (!v.urgentReason || v.urgentReason.length < 10) {
      return fail("Nêu rõ lý do đột xuất (ít nhất 10 ký tự) để chỉ huy xét duyệt.");
    }
  }

  // Giờ đến phải nằm trong khung giờ thăm và đúng mốc 30 phút.
  if (toMinutes(v.timeFrom) < toMinutes(window.start) || toMinutes(v.timeTo) > toMinutes(window.end)) {
    return fail(`Giờ đến nằm trong khung ${window.start} – ${window.end}.`);
  }
  if (toMinutes(v.timeTo) <= toMinutes(v.timeFrom)) {
    return fail("Giờ kết thúc phải sau giờ bắt đầu.");
  }
  if (v.visitDate === today && toMinutes(v.timeFrom) < toMinutes(nowTimeVN())) {
    return fail("Giờ bắt đầu đã qua. Chọn giờ muộn hơn hoặc ngày khác.");
  }

  // Một lượt gọi song song thay vì 5 lượt tuần tự — giảm độ trễ khi đông người.
  const [soldierQ, closuresQ, countQ, dupQ, recentQ] = await Promise.all([
    admin()
      .from("soldiers")
      .select("id, full_name, rank, class_id, squad_id, active")
      .eq("id", v.soldierId)
      .maybeSingle(),
    admin()
      .from("notices")
      .select("title, class_ids")
      .eq("kind", "closure")
      .eq("active", true)
      .lte("start_date", v.visitDate)
      .gte("end_date", v.visitDate),
    admin()
      .from("visit_requests")
      .select("id", { count: "exact", head: true })
      .eq("visit_date", v.visitDate)
      .in("status", ["pending", "approved", "checked_in"]),
    admin()
      .from("visit_requests")
      .select("code")
      .eq("phone", v.phone)
      .eq("visit_date", v.visitDate)
      .in("status", ["pending", "approved", "checked_in"])
      .maybeSingle(),
    admin()
      .from("visit_requests")
      .select("id", { count: "exact", head: true })
      .eq("phone", v.phone)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);

  const soldier = soldierQ.data;
  if (!soldier || !soldier.active) {
    return fail("Không tìm thấy quân nhân trong danh sách.");
  }

  const blocked = (closuresQ.data ?? []).find(
    (n) =>
      !n.class_ids?.length ||
      (soldier.class_id && n.class_ids.includes(soldier.class_id)),
  );
  if (blocked) return fail(`Ngày này đơn vị tạm dừng tiếp: ${blocked.title}.`);

  // Cuối tuần không giới hạn lượt; đơn đột xuất vẫn có suất riêng.
  if (kind === "urgent") {
    const cap = settings.capacity.urgent;
    if ((countQ.count ?? 0) >= cap) {
      return fail(
        "Đã hết suất đột xuất cho ngày này. Liên hệ trực ban đại đội.",
      );
    }
  }

  if (dupQ.data) {
    return fail(
      `Số điện thoại này đã đăng ký cho ngày ${monthDay(v.visitDate)}.`,
    );
  }

  if ((recentQ.count ?? 0) >= 5) {
    return fail("Số điện thoại này đã gửi quá nhiều đăng ký trong 24 giờ.");
  }

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
      time_from: v.timeFrom,
      time_to: v.timeTo,
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
    return fail(
      error?.message?.includes("column")
        ? "Hệ thống chưa cập nhật lược đồ giờ thăm (migration 0002)."
        : "Chưa gửi được đăng ký. Vui lòng thử lại sau ít phút.",
    );
  }

  await notifyStaff({
    title: kind === "urgent" ? "Đơn đột xuất mới" : "Đăng ký mới",
    body: `${v.visitorName} (${v.relation}) · ${soldier.full_name} · ${weekdayShort(
      v.visitDate,
    )} ${monthDay(v.visitDate)} · ${timeText({ time_from: v.timeFrom, time_to: v.timeTo })}`,
    url: "/chi-huy",
    tag: "dktt-don-moi",
  });

  // Ghi nhớ mã trên thiết bị này để thân nhân mở lại được trang đăng ký.
  const store = await cookies();
  store.set(RESULT_COOKIE, created.code, RESULT_COOKIE_OPTIONS);

  redirect(`/dang-ky/ket-qua/${created.code}?moi=1`);
}

/** Mở lại trang đăng ký khi mất cookie: xác nhận bằng 4 số cuối điện thoại. */
export async function unlockResult(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const tail = String(fd.get("tail") ?? "").replace(/\D/g, "");
  if (!code) return { error: "Thiếu mã đăng ký." };
  if (tail.length < 3) return { error: "Nhập ít nhất 3 số cuối điện thoại." };

  const { data } = await admin()
    .from("visit_requests")
    .select("code, phone")
    .eq("code", code)
    .maybeSingle();

  if (!data) return { error: "Không tìm thấy đăng ký này." };
  if (!String(data.phone).replace(/\D/g, "").endsWith(tail)) {
    return { error: "Số điện thoại không khớp với đăng ký." };
  }

  const store = await cookies();
  store.set(RESULT_COOKIE, data.code as string, RESULT_COOKIE_OPTIONS);
  redirect(`/dang-ky/ket-qua/${data.code}`);
}
