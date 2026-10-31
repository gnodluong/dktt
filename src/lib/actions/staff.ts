"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { notifyAllFamily, notifyFamily, notifyOwn } from "@/lib/push";
import { admin } from "@/lib/supabase/admin";
import { supa } from "@/lib/supabase/server";
import { monthDay, timeText, toMinutes, weekdayShort } from "@/lib/domain";
import type { FormState } from "@/lib/form";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export async function signIn(_prev: FormState | null, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!raw || !password) return { error: "Nhập tên đăng nhập và mật khẩu." };

  // Cho phép gõ họ tên ("Lê Văn Mạnh"), tên rút gọn ("levanmanh") hoặc email.
  const email = raw.includes("@") ? raw : `${slug(raw)}@daidoi5.vn`;

  const sb = await supa();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  redirect("/chi-huy");
}

export async function signOut() {
  const sb = await supa();
  await sb.auth.signOut();
  redirect("/chi-huy/login");
}

const DECISIONS = ["approve", "reject", "cancel", "checkin"] as const;

export async function decide(_prev: FormState | null, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const id = String(fd.get("id") ?? "");
  const action = String(fd.get("action") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);

  if (!id || !DECISIONS.includes(action as (typeof DECISIONS)[number])) {
    return { error: "Yêu cầu không hợp lệ." };
  }
  const next =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action === "checkin"
          ? "checked_in"
          : "cancelled";

  const { data: req } = await admin()
    .from("visit_requests")
    .select(
      "id, code, status, visitor_name, soldier_name, visit_date, time_from, time_to, session, phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (!req) return { error: "Không tìm thấy phiếu." };
  if (req.status === "checked_in" && action !== "cancel") {
    return { error: "Phiếu đã được ghi nhận tiếp." };
  }

  const { error } = await admin()
    .from("visit_requests")
    .update({
      status: next,
      decision_note: note || null,
      decided_by: staff.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "Chưa lưu được quyết định. Thử lại." };

  if (next === "approved" || next === "rejected" || next === "cancelled") {
    const settings = await getSettings();
    const place = settings.contact;
    await notifyFamily(req.id, {
      title:
        next === "approved"
          ? "Phiếu đã được duyệt"
          : next === "rejected"
            ? "Phiếu chưa được duyệt"
            : "Phiếu đã được huỷ",
      body:
        next === "approved"
          ? `${req.soldier_name} · ${weekdayShort(req.visit_date)} ${monthDay(
              req.visit_date,
            )} · ${timeText(req)}. Đến ${place.address}, gặp ${place.name} (${place.phone}).`
          : `${req.soldier_name} · ${weekdayShort(req.visit_date)} ${monthDay(
              req.visit_date,
            )} · ${timeText(req)}${note ? ` — ${note}` : ""}`,
      url: `/phieu/${req.code}`,
      tag: `dktt-${req.code}`,
    });
  }

  revalidatePath("/chi-huy");
  revalidatePath("/chi-huy/don");
  revalidatePath("/");
  revalidatePath(`/phieu/${req.code}`);
  return {
    ok: true,
    notice:
      next === "approved"
        ? "Đã duyệt và gửi thông báo cho thân nhân."
        : next === "rejected"
          ? "Đã từ chối và thông báo cho thân nhân."
          : next === "checked_in"
            ? "Đã ghi nhận thân nhân đến tiếp."
            : "Đã huỷ phiếu.",
  };
}

export async function publishNotice(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  const staff = await requireStaff();
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const body = String(fd.get("body") ?? "").trim().slice(0, 1200);
  const kind = fd.get("kind") === "closure" ? "closure" : "general";
  const startDate = String(fd.get("startDate") ?? "") || null;
  const endDate = String(fd.get("endDate") ?? "") || null;
  const classIds = fd.getAll("classIds").map(String).filter(Boolean);
  const shouldPush = fd.get("push") === "on";

  if (title.length < 4) return { error: "Nhập tiêu đề thông báo." };
  if (body.length < 10) return { error: "Nội dung thông báo quá ngắn." };
  if (kind === "closure" && (!startDate || !endDate)) {
    return { error: "Chọn ngày bắt đầu và kết thúc cho lịch tạm dừng." };
  }

  const { data, error } = await admin()
    .from("notices")
    .insert({
      title,
      body,
      kind,
      start_date: kind === "closure" ? startDate : startDate,
      end_date: kind === "closure" ? endDate : endDate,
      class_ids: classIds.length ? classIds : null,
      created_by: staff.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Chưa đăng được thông báo." };

  if (shouldPush) {
    await notifyAllFamily({
      title: kind === "closure" ? "Tạm dừng tiếp thân nhân" : "Thông báo từ đại đội",
      body: title,
      url: `/thong-bao/${data.id}`,
      tag: `dktt-tb-${data.id}`,
    });
  }

  revalidatePath("/");
  revalidatePath("/thong-bao");
  revalidatePath("/chi-huy/thong-bao");
  revalidatePath("/chi-huy/lich");
  return { ok: true, notice: shouldPush ? "Đã đăng và gửi thông báo đẩy." : "Đã đăng thông báo." };
}

export async function toggleNotice(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id") ?? "");
  const active = fd.get("active") === "true";
  if (!id) return;
  await admin().from("notices").update({ active }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/thong-bao");
  revalidatePath("/chi-huy/thong-bao");
  revalidatePath("/chi-huy/lich");
}

export async function saveProfile(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  const staff = await requireStaff();
  const fullName = String(fd.get("fullName") ?? "").trim().slice(0, 60);
  const phone = String(fd.get("phone") ?? "").trim().slice(0, 20);
  if (fullName.length < 3) return { error: "Nhập họ tên." };
  const { error } = await admin()
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", staff.id);
  if (error) return { error: "Chưa lưu được." };
  revalidatePath("/chi-huy/cai-dat");
  return { ok: true, notice: "Đã lưu." };
}

export async function saveVisitWindow(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  await requireStaff();
  const start = String(fd.get("start") ?? "");
  const end = String(fd.get("end") ?? "");
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return { error: "Chọn giờ hợp lệ." };
  }
  if (toMinutes(end) - toMinutes(start) < 30) {
    return { error: "Khung giờ phải dài ít nhất 30 phút." };
  }
  const { error } = await admin()
    .from("settings")
    .upsert({ key: "visit_window", value: { start, end } });
  if (error) return { error: "Chưa lưu được khung giờ." };
  revalidatePath("/chi-huy/cai-dat");
  revalidatePath("/chi-huy/lich");
  revalidatePath("/dang-ky");
  revalidatePath("/dang-ky/dot-xuat");
  revalidatePath("/");
  return { ok: true, notice: `Khung giờ thăm: ${start} – ${end}.` };
}

export async function sendTestPush(): Promise<FormState> {
  const staff = await requireStaff();
  const sent = await notifyOwn(staff.id, {
    title: "Đại đội 5",
    body: "Thông báo đẩy đã bật trên thiết bị này.",
    url: "/chi-huy",
    tag: "dktt-test",
  });
  return sent
    ? { ok: true, notice: `Đã gửi thử tới ${sent} thiết bị.` }
    : { error: "Chưa có thiết bị nào đăng ký nhận thông báo đẩy." };
}
