import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getRequests } from "@/lib/data";
import { ExportCsv } from "@/components/ExportCsv";
import { StatusPill } from "@/components/StatusPill";
import {
  SESSIONS,
  STATUS_LABEL,
  classLabel,
  longDate,
  monthDay,
  squadLabel,
  todayVN,
  weekdayShort,
  type Status,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Phiếu đăng ký" };

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "checked_in", label: "Đã tiếp" },
  { key: "rejected", label: "Từ chối" },
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const status = (sp.status ?? "all") as Status | "all";
  const date = sp.date ?? "";
  const rows = await getRequests({ status, date: date || undefined, limit: 300 });

  const csv: (string | number)[][] = [
    [
      "Mã phiếu",
      "Trạng thái",
      "Người đến thăm",
      "Quan hệ",
      "Điện thoại",
      "Số người",
      "Quân nhân",
      "Lớp",
      "Tiểu đội",
      "Ngày đến",
      "Buổi",
      "Loại",
      "Ghi chú",
    ],
    ...rows.map((r) => [
      r.code,
      STATUS_LABEL[r.status],
      r.visitor_name,
      r.relation,
      r.phone,
      r.companions,
      r.soldier_name,
      classLabel(r.class_id),
      squadLabel(r.squad_id),
      r.visit_date,
      SESSIONS[r.session].label,
      r.kind === "urgent" ? "Đột xuất" : "Cuối tuần",
      r.decision_note ?? "",
    ]),
  ];

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Sổ phiếu</h1>
          <p className="small muted">
            {rows.length} phiếu{date ? ` · ${longDate(date)}` : ""}
          </p>
        </div>
        <div className="btn-row">
          <ExportCsv rows={csv} filename={`phieu-${date || todayVN()}.csv`} />
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/chi-huy/don?status=${t.key}${date ? `&date=${date}` : ""}`}
            className={status === t.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form method="get" className="btn-row" style={{ marginBottom: 18 }}>
        <input type="hidden" name="status" value={status} />
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="input"
          style={{ maxWidth: 176, minHeight: 38 }}
          aria-label="Lọc theo ngày"
        />
        <button type="submit" className="btn btn-ghost btn-sm">
          Lọc ngày
        </button>
        {date ? (
          <Link href={`/chi-huy/don?status=${status}`} className="btn btn-quiet btn-sm">
            Bỏ lọc
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <div className="empty">
          <strong>Không có phiếu nào</strong>
          <p>Thử đổi bộ lọc hoặc bỏ lọc ngày.</p>
        </div>
      ) : (
        <div className="rows">
          {rows.map((r) => (
            <div key={r.id} className="row">
              <div>
                <div className="who">
                  {r.visitor_name}{" "}
                  <span className="muted small" style={{ fontWeight: 500 }}>
                    · {r.relation}
                  </span>
                </div>
                <div className="meta">
                  {r.code} · {r.soldier_name} · {classLabel(r.class_id)}
                  {r.squad_id ? ` · ${squadLabel(r.squad_id)}` : ""}
                </div>
              </div>
              <div className="when small">
                {weekdayShort(r.visit_date)} {monthDay(r.visit_date)} ·{" "}
                {SESSIONS[r.session].label}
                <div className="tiny muted">
                  {r.kind === "urgent" ? "Đột xuất" : "Cuối tuần"} · {r.companions} người
                </div>
              </div>
              <div>
                <StatusPill status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
