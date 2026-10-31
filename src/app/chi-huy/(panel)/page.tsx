import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDashboard, getStaffTitle } from "@/lib/data";
import { Queue } from "@/components/Queue";
import { StatusPill } from "@/components/StatusPill";
import {
  longDate,
  monthDay,
  timeText,
  weekdayName,
  weekdayShort,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bàn trực" };

export default async function DashboardPage() {
  const profile = await requireStaff();
  const [d, title] = await Promise.all([
    getDashboard(),
    getStaffTitle(profile.email),
  ]);

  const upcoming = d.days.filter((x) => x.date >= d.today).slice(0, 6);

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Bàn trực</h1>
          <p className="small muted">
            {longDate(d.today)} · {profile.full_name}
            {title ? ` — ${title}` : ""}
          </p>
        </div>
        <div className="btn-row">
          <Link href="/chi-huy/don" className="btn btn-ghost btn-sm">
            Lịch sử đăng ký
          </Link>
          <Link href="/chi-huy/thong-bao" className="btn btn-primary btn-sm">
            Tạo thông báo
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Chờ duyệt</span>
          <b>{d.pending.length}</b>
        </div>
        <div className="stat">
          <span>Duyệt hôm nay</span>
          <b>{d.approvedToday}</b>
        </div>
        <div className="stat">
          <span>Đã tiếp hôm nay</span>
          <b>{d.checkedInToday}</b>
        </div>
        <div className="stat">
          <span>Lượt cuối tuần tới</span>
          <b>{d.upcoming}</b>
        </div>
        <div className="stat">
          <span>Lượt trong tháng</span>
          <b>{d.monthCount}</b>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 26 }}>
        <div className="stack-lg">
          <Queue pending={d.pending} today={d.todayRows} />

          <section className="stack">
            <div className="sec-head">
              <h2>Lịch sử đăng ký gần đây</h2>
              <Link href="/chi-huy/don">Tất cả</Link>
            </div>
            {d.recent.length === 0 ? (
              <p className="small muted">Chưa có phiếu nào.</p>
            ) : (
              <div className="rows" style={{ borderTop: 0 }}>
                {d.recent.map((r) => (
                  <div key={r.id} className="row">
                    <div>
                      <div className="who">
                        {r.visitor_name}{" "}
                        <span className="muted small" style={{ fontWeight: 500 }}>
                          · {r.relation}
                        </span>
                      </div>
                      <div className="meta">
                        {r.code} · {r.soldier_name}
                      </div>
                    </div>
                    <div className="when small">
                      {weekdayShort(r.visit_date)} {monthDay(r.visit_date)} ·{" "}
                      {timeText(r)}
                      <div className="tiny muted">
                        {r.kind === "urgent" ? "Đột xuất" : "Cuối tuần"} ·{" "}
                        {r.companions} người
                      </div>
                    </div>
                    <div>
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="stack-lg">
          <section className="stack">
            <div className="sec-head">
              <h2>Sáu ngày tới</h2>
              <Link href="/chi-huy/lich">Lịch</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="small muted">Chưa có ngày nào.</p>
            ) : (
              <div className="day-loads">
                {upcoming.map((day) => {
                  const pct = Math.min(
                    100,
                    Math.round((day.loaded / Math.max(1, day.capacity)) * 100),
                  );
                  return (
                    <div key={day.date} className="day-load">
                      <span className="dl-name">
                        {weekdayName(day.date)} {monthDay(day.date)}
                      </span>
                      <span className="dl-count">
                        {day.loaded}/{day.capacity}
                      </span>
                      <span className="dl-bar" aria-hidden>
                        <i
                          style={{
                            width: `${pct}%`,
                            background: day.closed ? "var(--stamp)" : "var(--accent)",
                          }}
                        />
                      </span>
                      {day.closed ? (
                        <span className="tiny muted">Tạm dừng</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="stack">
            <div className="sec-head">
              <h2>Thông báo hiệu lực</h2>
              <Link href="/chi-huy/thong-bao">Quản lý</Link>
            </div>
            {d.notices.length === 0 ? (
              <p className="small muted">Không có thông báo nào.</p>
            ) : (
              d.notices.map((n) => (
                <div key={n.id} className="stack-sm">
                  <div className="who" style={{ fontWeight: 600 }}>
                    {n.title}
                  </div>
                  <div className="tiny muted">
                    {n.kind === "closure" ? "Tạm dừng · " : ""}
                    {n.start_date && n.end_date
                      ? `${monthDay(n.start_date)} – ${monthDay(n.end_date)}`
                      : "Thông báo chung"}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="stack">
            <div className="sec-head">
              <h2>Việc thường dùng</h2>
            </div>
            <div className="stack-sm">
              <Link href="/chi-huy/quan-nhan/nhap" className="btn btn-ghost">
                Nhập danh sách quân nhân
              </Link>
              <Link href="/chi-huy/lop" className="btn btn-ghost">
                Lớp &amp; tiểu đội
              </Link>
              <Link href="/chi-huy/cai-dat" className="btn btn-ghost">
                Khung giờ thăm &amp; thông báo đẩy
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
