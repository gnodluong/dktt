import { admin } from "@/lib/supabase/admin";
import {
  type DayInfo,
  type Notice,
  type Soldier,
  type Status,
  type VisitRequest,
  addDays,
  todayVN,
  upcomingWeekend,
  weekendDays,
} from "@/lib/domain";

export interface UnitSettings {
  capacity: { weekend: number; urgent: number };
  cutoffHour: number;
  unit: { don_vi: string; tieu_doan: string; truong: string; hotline: string };
  visitWindow: { start: string; end: string };
  contact: { name: string; phone: string; address: string };
}

const FALLBACK: UnitSettings = {
  capacity: { weekend: 40, urgent: 6 },
  cutoffHour: 20,
  unit: {
    don_vi: "Đại đội 5",
    tieu_doan: "Tiểu đoàn 2",
    truong: "Trường Cao đẳng Hậu cần 2",
    hotline: "096418047",
  },
  visitWindow: { start: "08:30", end: "15:00" },
  contact: {
    name: "Lê Văn Mạnh",
    phone: "096418047",
    address: "Số 50 Lê Văn Việt",
  },
};

export async function getSettings(): Promise<UnitSettings> {
  try {
    const { data } = await admin().from("settings").select("key, value");
    const map = new Map((data ?? []).map((r) => [r.key as string, r.value]));
    return {
      capacity: { ...FALLBACK.capacity, ...(map.get("capacity") as object) },
      cutoffHour: Number(map.get("cutoff_hour") ?? FALLBACK.cutoffHour),
      unit: { ...FALLBACK.unit, ...(map.get("unit") as object) },
      visitWindow: {
        ...FALLBACK.visitWindow,
        ...(map.get("visit_window") as object),
      },
      contact: { ...FALLBACK.contact, ...(map.get("contact") as object) },
    };
  } catch {
    return FALLBACK;
  }
}

export async function getStaffTitle(email: string): Promise<string> {
  try {
    const { data } = await admin()
      .from("settings")
      .select("value")
      .eq("key", "staff_titles")
      .maybeSingle();
    const map = (data?.value ?? {}) as Record<string, string>;
    return map[email] ?? "";
  } catch {
    return "";
  }
}

export async function getSoldiers(): Promise<Soldier[]> {
  try {
    const { data } = await admin()
      .from("soldiers")
      .select("id, code, full_name, rank, position, class_id, squad_id")
      .eq("active", true)
      .order("class_id")
      .order("squad_id")
      .order("full_name");
    return (data ?? []) as Soldier[];
  } catch {
    return [];
  }
}

export async function getAllSoldiers(): Promise<Soldier[]> {
  try {
    const { data } = await admin()
      .from("soldiers")
      .select("id, code, full_name, rank, position, class_id, squad_id, phone, active")
      .order("class_id")
      .order("squad_id")
      .order("full_name");
    return (data ?? []) as Soldier[];
  } catch {
    return [];
  }
}

export async function getSoldier(id: string): Promise<Soldier | null> {
  try {
    const { data } = await admin()
      .from("soldiers")
      .select("id, code, full_name, rank, position, class_id, squad_id, phone, address, note, active")
      .eq("id", id)
      .maybeSingle();
    return (data as Soldier) ?? null;
  } catch {
    return null;
  }
}

export async function getClasses() {
  try {
    const { data } = await admin()
      .from("classes")
      .select("id, name, short_name, sort_order, active")
      .order("sort_order");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getSquads() {
  try {
    const { data } = await admin()
      .from("squads")
      .select("id, class_id, name, sort_order")
      .order("class_id")
      .order("sort_order");
    return data ?? [];
  } catch {
    return [];
  }
}

async function closureNotices(from: string, to: string): Promise<Notice[]> {
  try {
    const { data } = await admin()
      .from("notices")
      .select("id, title, body, kind, start_date, end_date, class_ids, active, created_at")
      .eq("kind", "closure")
      .eq("active", true)
      .lte("start_date", to)
      .gte("end_date", from);
    return (data ?? []) as Notice[];
  } catch {
    return [];
  }
}

function closureFor(date: string, notices: Notice[]) {
  return notices.filter(
    (n) => n.start_date && n.end_date && n.start_date <= date && date <= n.end_date,
  );
}

export interface ScopedDay extends DayInfo {
  partial: string[];
  partialReason: string | null;
}

export async function getDays(weeks = 3): Promise<ScopedDay[]> {
  const today = todayVN();
  const dates = weekendDays(weeks, today);
  if (!dates.length) return [];
  const [settings, notices, load] = await Promise.all([
    getSettings(),
    closureNotices(dates[0], dates.at(-1)!),
    loadByDay(dates[0], dates.at(-1)!),
  ]);

  return dates.map((date) => {
    const hits = closureFor(date, notices);
    const whole = hits.filter((n) => !n.class_ids || n.class_ids.length === 0);
    const scoped = hits.filter((n) => n.class_ids && n.class_ids.length > 0);
    const count = (load.get(date) ?? 0);
    const capacity = settings.capacity.weekend;
    return {
      date,
      closed: whole.length > 0,
      reason: whole[0]?.title ?? null,
      partial: scoped.flatMap((n) => n.class_ids ?? []),
      partialReason: scoped[0]?.title ?? null,
      loaded: count,
      capacity,
    };
  });
}

async function loadByDay(from: string, to: string) {
  const map = new Map<string, number>();
  try {
    const { data } = await admin()
      .from("visit_requests")
      .select("visit_date, status")
      .gte("visit_date", from)
      .lte("visit_date", to)
      .in("status", ["approved", "checked_in"]);
    for (const row of data ?? []) {
      const d = row.visit_date as string;
      map.set(d, (map.get(d) ?? 0) + 1);
    }
  } catch {
    /* chưa cấu hình Supabase */
  }
  return map;
}

export async function getNotices(limit = 5, activeOnly = true): Promise<Notice[]> {
  try {
    let q = admin()
      .from("notices")
      .select("id, title, body, kind, start_date, end_date, class_ids, active, created_at");
    if (activeOnly) q = q.eq("active", true);
    const { data } = await q.order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as Notice[];
  } catch {
    return [];
  }
}

export async function getNotice(id: string): Promise<Notice | null> {
  try {
    const { data } = await admin()
      .from("notices")
      .select("id, title, body, kind, start_date, end_date, class_ids, active, created_at")
      .eq("id", id)
      .maybeSingle();
    return (data as Notice) ?? null;
  } catch {
    return null;
  }
}

export async function getRequestByCode(code: string): Promise<VisitRequest | null> {
  try {
    const { data } = await admin()
      .from("visit_requests")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    return (data as VisitRequest) ?? null;
  } catch {
    return null;
  }
}

export async function getRequest(id: string): Promise<VisitRequest | null> {
  try {
    const { data } = await admin()
      .from("visit_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as VisitRequest) ?? null;
  } catch {
    return null;
  }
}

export interface RequestFilter {
  status?: Status | "all";
  date?: string;
  limit?: number;
}

export async function getRequests(
  filter: RequestFilter = {},
): Promise<VisitRequest[]> {
  try {
    let q = admin().from("visit_requests").select("*");
    if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
    if (filter.date) q = q.eq("visit_date", filter.date);
    const { data } = await q
      .order("created_at", { ascending: false })
      .limit(filter.limit ?? 200);
    return (data ?? []) as VisitRequest[];
  } catch {
    return [];
  }
}

export async function getDashboard() {
  const today = todayVN();
  try {
    const [pending, todayRows, recent, days, notices] = await Promise.all([
      getRequests({ status: "pending", limit: 100 }),
      getRequests({ date: today, limit: 200 }),
      getRequests({ limit: 8 }),
      getDays(3),
      getNotices(3),
    ]);

    const approvedToday = todayRows.filter((r) =>
      ["approved", "checked_in"].includes(r.status),
    ).length;
    const checkedInToday = todayRows.filter((r) => r.status === "checked_in").length;
    const upcoming = days
      .filter((d) => d.date >= today)
      .reduce((n, d) => n + d.loaded, 0);

    let monthCount = 0;
    try {
      const { count } = await admin()
        .from("visit_requests")
        .select("id", { count: "exact", head: true })
        .gte("visit_date", `${today.slice(0, 8)}01`)
        .lte("visit_date", today);
      monthCount = count ?? 0;
    } catch {
      /* bỏ qua */
    }

    return {
      today,
      pending,
      todayRows,
      recent,
      days,
      notices,
      approvedToday,
      checkedInToday,
      upcoming,
      monthCount,
    };
  } catch {
    return {
      today,
      pending: [] as VisitRequest[],
      todayRows: [] as VisitRequest[],
      recent: [] as VisitRequest[],
      days: [] as ScopedDay[],
      notices: [] as Notice[],
      approvedToday: 0,
      checkedInToday: 0,
      upcoming: 0,
      monthCount: 0,
    };
  }
}

export interface UrgentDay {
  date: string;
  closed: boolean;
  reason: string | null;
  count: number;
  capacity: number;
}

export async function getUrgentDays(): Promise<UrgentDay[]> {
  const today = todayVN();
  const dates = [today, addDays(today, 1), addDays(today, 2)];
  const settings = await getSettings();
  const notices = await closureNotices(dates[0], dates.at(-1)!);
  const counts = new Map<string, number>();

  try {
    const { data } = await admin()
      .from("visit_requests")
      .select("visit_date")
      .eq("kind", "urgent")
      .in("visit_date", dates)
      .in("status", ["pending", "approved", "checked_in"]);
    for (const row of data ?? []) {
      const d = row.visit_date as string;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  } catch {
    /* chưa cấu hình */
  }

  return dates.map((date) => {
    const hits = closureFor(date, notices);
    const whole = hits.filter((n) => !n.class_ids?.length);
    return {
      date,
      closed: whole.length > 0,
      reason: whole[0]?.title ?? null,
      count: counts.get(date) ?? 0,
      capacity: settings.capacity.urgent,
    };
  });
}
