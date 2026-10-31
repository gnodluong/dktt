export const TZ = "Asia/Ho_Chi_Minh";

export type Status = "pending" | "approved" | "rejected" | "cancelled" | "checked_in";
export type Kind = "weekend" | "urgent";
export type Session = "sang" | "chieu";

export interface Soldier {
  id: string;
  code: string | null;
  full_name: string;
  rank: string | null;
  position: string | null;
  class_id: string | null;
  squad_id: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
  active?: boolean;
}

export interface VisitRequest {
  id: string;
  code: string;
  kind: Kind;
  status: Status;
  soldier_id: string | null;
  soldier_name: string;
  soldier_rank: string | null;
  class_id: string | null;
  squad_id: string | null;
  visit_date: string;
  session: Session;
  visitor_name: string;
  relation: string;
  phone: string;
  id_card: string | null;
  address: string | null;
  companions: number;
  companion_names: string | null;
  purpose: string | null;
  note: string | null;
  urgent_reason: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  kind: "closure" | "general";
  start_date: string | null;
  end_date: string | null;
  class_ids: string[] | null;
  active: boolean;
  created_at: string;
}

export interface DayInfo {
  date: string;
  closed: boolean;
  reason: string | null;
  loaded: number;
  capacity: number;
}

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
  checked_in: "Đã tiếp",
};

export const SESSIONS: Record<Session, { label: string; time: string }> = {
  sang: { label: "Sáng", time: "08:00 – 10:30" },
  chieu: { label: "Chiều", time: "14:00 – 16:30" },
};

export const RELATIONS = [
  "Cha",
  "Mẹ",
  "Vợ",
  "Chồng",
  "Anh",
  "Chị",
  "Em",
  "Con",
  "Ông",
  "Bà",
  "Cô, dì",
  "Chú, bác",
  "Khác",
];

const WD = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WD_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowHourVN(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function weekdayName(iso: string): string {
  return WD[weekday(iso)];
}

export function weekdayShort(iso: string): string {
  return WD_SHORT[weekday(iso)];
}

export function monthDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${weekdayName(iso)}, ${d}/${m}/${y}`;
}

export function isWeekend(iso: string): boolean {
  const w = weekday(iso);
  return w === 0 || w === 6;
}

/** Ngày T7/CN gần nhất, luôn trả về cặp [Thứ Bảy, Chủ nhật]. */
export function upcomingWeekend(today = todayVN()): [string, string] {
  const offset = (6 - weekday(today) + 7) % 7;
  const sat = addDays(today, offset);
  return [sat, addDays(sat, 1)];
}

/** Các ngày cuối tuần từ hôm nay tới `weeks` tuần sau. */
export function weekendDays(weeks = 3, today = todayVN()): string[] {
  const out: string[] = [];
  for (let i = 0; i <= weeks * 7; i += 1) {
    const d = addDays(today, i);
    if (isWeekend(d)) out.push(d);
  }
  return out;
}

export function classLabel(id?: string | null): string {
  if (!id) return "";
  return id;
}

export function squadLabel(id?: string | null): string {
  if (!id) return "";
  const n = id.split("-").pop();
  return n ? `Tiểu đội ${n}` : "";
}
