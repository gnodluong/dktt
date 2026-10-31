"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { admin } from "@/lib/supabase/admin";
import { parseRosterFile } from "@/lib/roster-import";
import type { FormState } from "@/lib/form";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function classId(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}0-9._-]/gu, "")
    .slice(0, 24);
}

function refreshRoster() {
  revalidateTag("roster", "max");
  revalidatePath("/chi-huy/quan-nhan");
  revalidatePath("/chi-huy/lop");
  revalidatePath("/chi-huy");
  revalidatePath("/dang-ky");
  revalidatePath("/");
}

export async function createClass(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  await requireStaff();
  const id = classId(String(fd.get("code") ?? ""));
  const name = String(fd.get("name") ?? "").trim() || id;

  if (id.length < 2) return { error: "Mã lớp cần ít nhất 2 ký tự, ví dụ K4." };
  if (name.length > 40) return { error: "Tên lớp quá dài." };

  const { data: exists } = await admin()
    .from("classes")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (exists) return { error: `Mã lớp ${id} đã có.` };

  const { data: last } = await admin()
    .from("classes")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin()
    .from("classes")
    .insert({
      id,
      name,
      short_name: id,
      sort_order: Number(last?.sort_order ?? 0) + 1,
    });

  if (error) return { error: "Chưa tạo được lớp." };
  refreshRoster();
  return { ok: true, notice: `Đã thêm lớp ${name}.` };
}

export async function toggleClass(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id") ?? "");
  const active = fd.get("active") === "true";
  if (!id) return;
  await admin().from("classes").update({ active }).eq("id", id);
  refreshRoster();
}

export async function createSquad(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  await requireStaff();
  const classIdValue = String(fd.get("classId") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!classIdValue) return { error: "Chọn lớp." };
  if (name.length < 2) return { error: "Nhập tên tiểu đội, ví dụ Tiểu đội 6." };

  const { data: squads } = await admin()
    .from("squads")
    .select("id, name")
    .eq("class_id", classIdValue);

  if ((squads ?? []).some((s) => plain(s.name as string) === plain(name))) {
    return { error: "Tiểu đội này đã có trong lớp." };
  }

  let next = (squads ?? []).length + 1;
  while ((squads ?? []).some((s) => s.id === `${classIdValue}-${next}`)) next += 1;

  const { error } = await admin().from("squads").insert({
    id: `${classIdValue}-${next}`,
    class_id: classIdValue,
    name,
    sort_order: next,
  });

  if (error) return { error: "Chưa tạo được tiểu đội." };
  refreshRoster();
  return { ok: true, notice: `Đã thêm ${name} vào lớp ${classIdValue}.` };
}

export async function saveSoldier(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  await requireStaff();
  const id = String(fd.get("id") ?? "");
  const fullName = String(fd.get("fullName") ?? "").trim();
  const classIdValue = String(fd.get("classId") ?? "");
  const squadId = String(fd.get("squadId") ?? "");
  const rank = String(fd.get("rank") ?? "").trim();
  const position = String(fd.get("position") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").replace(/\s/g, "");
  const address = String(fd.get("address") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  const active = fd.get("active") !== "off";

  if (fullName.length < 3) return { error: "Nhập họ tên quân nhân." };
  if (fullName.length > 60) return { error: "Họ tên quá dài." };
  if (!classIdValue) return { error: "Chọn lớp." };
  if (phone && !/^0\d{8,10}$/.test(phone)) return { error: "Số điện thoại không hợp lệ." };

  let code: string | null = null;
  if (!id) {
    const { data: peers } = await admin()
      .from("soldiers")
      .select("code")
      .eq("class_id", classIdValue);
    let max = 0;
    for (const p of peers ?? []) {
      const n = Number.parseInt(String(p.code ?? "").split("-").pop() ?? "", 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    code = `${classIdValue}-${String(max + 1).padStart(3, "0")}`;
  }

  const payload = {
    full_name: fullName,
    rank: rank || null,
    position: position || null,
    class_id: classIdValue,
    squad_id: squadId || null,
    phone: phone || null,
    address: address || null,
    note: note || null,
    active,
    ...(code ? { code } : {}),
  };

  const { error } = id
    ? await admin().from("soldiers").update(payload).eq("id", id)
    : await admin().from("soldiers").insert(payload);

  if (error) return { error: "Chưa lưu được quân nhân." };
  refreshRoster();
  redirect("/chi-huy/quan-nhan");
}

export async function toggleSoldier(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id") ?? "");
  const active = fd.get("active") === "true";
  if (!id) return;
  await admin().from("soldiers").update({ active }).eq("id", id);
  refreshRoster();
}

export async function importRoster(
  _prev: FormState | null,
  fd: FormData,
): Promise<FormState> {
  await requireStaff();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Chọn tệp .xlsx, .docx hoặc .csv." };
  }
  if (file.size > 4 * 1024 * 1024) return { error: "Tệp lớn hơn 4 MB." };

  let parsed;
  try {
    parsed = await parseRosterFile(file);
  } catch (err) {
    return { error: (err as Error).message || "Không đọc được tệp." };
  }

  if (parsed.rows.length === 0) {
    return {
      error:
        parsed.errors[0] ??
        "Không đọc được dòng nào. Kiểm tra lại tiêu đề cột (Họ và tên, Lớp).",
    };
  }

  const [{ data: classes }, { data: squads }, { data: soldiers }] =
    await Promise.all([
      admin().from("classes").select("id, name, sort_order"),
      admin().from("squads").select("id, class_id, name, sort_order"),
      admin().from("soldiers").select("id, code, full_name, class_id"),
    ]);

  const classMap = new Map<string, string>();
  for (const c of classes ?? []) {
    classMap.set(plain(c.id as string), c.id as string);
    classMap.set(plain(c.name as string), c.id as string);
  }

  const squadMap = new Map<string, string>();
  const maxSquad = new Map<string, number>();
  for (const s of squads ?? []) {
    squadMap.set(`${s.class_id}::${plain(s.name as string)}`, s.id as string);
    const n = Number.parseInt(String(s.id).split("-").pop() ?? "", 10);
    if (Number.isFinite(n)) {
      maxSquad.set(s.class_id as string, Math.max(maxSquad.get(s.class_id as string) ?? 0, n));
    }
  }

  const soldierMap = new Map<string, string>();
  const maxCode = new Map<string, number>();
  for (const s of soldiers ?? []) {
    if (s.class_id) {
      soldierMap.set(`${s.class_id}::${plain(s.full_name as string)}`, s.id as string);
      const n = Number.parseInt(String(s.code ?? "").split("-").pop() ?? "", 10);
      if (Number.isFinite(n)) {
        maxCode.set(s.class_id as string, Math.max(maxCode.get(s.class_id as string) ?? 0, n));
      }
    }
  }

  let created = 0;
  let updated = 0;
  let classesCreated = 0;
  let squadsCreated = 0;
  const skipped: string[] = [];

  for (const row of parsed.rows) {
    try {
      const key = plain(row.class_name);
      let classIdValue = classMap.get(key);
      if (!classIdValue) {
        const id = classId(row.class_name);
        if (!id) {
          skipped.push(`“${row.full_name}”: tên lớp không hợp lệ.`);
          continue;
        }
        const { error } = await admin().from("classes").insert({
          id,
          name: row.class_name.trim(),
          short_name: id,
          sort_order: (classes?.length ?? 0) + classesCreated + 1,
        });
        if (error) {
          skipped.push(`“${row.full_name}”: không tạo được lớp ${id}.`);
          continue;
        }
        classIdValue = id;
        classMap.set(key, id);
        classesCreated += 1;
      }

      let squadId: string | null = null;
      if (row.squad_name) {
        const squadKey = `${classIdValue}::${plain(row.squad_name)}`;
        squadId = squadMap.get(squadKey) ?? null;
        if (!squadId) {
          const next = (maxSquad.get(classIdValue) ?? 0) + 1;
          const newId = `${classIdValue}-${next}`;
          const { error } = await admin().from("squads").insert({
            id: newId,
            class_id: classIdValue,
            name: row.squad_name,
            sort_order: next,
          });
          if (!error) {
            squadId = newId;
            squadMap.set(squadKey, newId);
            maxSquad.set(classIdValue, next);
            squadsCreated += 1;
          }
        }
      }

      const personKey = `${classIdValue}::${plain(row.full_name)}`;
      const existingId = soldierMap.get(personKey);

      if (existingId) {
        const patch: Record<string, unknown> = {
          full_name: row.full_name,
          class_id: classIdValue,
        };
        if (row.rank) patch.rank = row.rank;
        if (row.position) patch.position = row.position;
        if (squadId) patch.squad_id = squadId;
        if (row.phone) patch.phone = row.phone;
        if (row.address) patch.address = row.address;
        if (row.note) patch.note = row.note;
        const { error } = await admin()
          .from("soldiers")
          .update(patch)
          .eq("id", existingId);
        if (error) skipped.push(`“${row.full_name}”: không cập nhật được.`);
        else updated += 1;
      } else {
        const next = (maxCode.get(classIdValue) ?? 0) + 1;
        maxCode.set(classIdValue, next);
        const { error } = await admin().from("soldiers").insert({
          code: `${classIdValue}-${String(next).padStart(3, "0")}`,
          full_name: row.full_name,
          rank: row.rank,
          position: row.position,
          class_id: classIdValue,
          squad_id: squadId,
          phone: row.phone,
          address: row.address,
          note: row.note,
          active: true,
        });
        if (error) skipped.push(`“${row.full_name}”: không thêm được.`);
        else {
          created += 1;
          soldierMap.set(personKey, "new");
        }
      }
    } catch {
      skipped.push(`“${row.full_name}”: lỗi không xác định.`);
    }
  }

  refreshRoster();

  const parts = [
    `thêm ${created}`,
    `cập nhật ${updated}`,
    classesCreated ? `lớp mới ${classesCreated}` : "",
    squadsCreated ? `tiểu đội mới ${squadsCreated}` : "",
    skipped.length ? `bỏ qua ${skipped.length}` : "",
  ].filter(Boolean);

  const detail = skipped.slice(0, 4).join(" ");
  return {
    ok: true,
    notice: `Đã nhập: ${parts.join(", ")}.${detail ? ` ${detail}` : ""}`,
  };
}
