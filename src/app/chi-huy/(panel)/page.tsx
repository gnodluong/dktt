import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Queue } from "@/components/Queue";
import { getDashboard, getDays, getSettings } from "@/lib/data";
import { longDate, monthDay, weekdayShort } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bàn trực" };

export default async function DashboardPage() {
  await requireStaff();
  const [d, days, settings] = await Promise.all([
    getDashboard(),
    getDays(2),
    getSettings(),
  ]);

  const capacity = settings.capacity.weekend * 2;
  const remaining = Math.max(capacity - d.approvedToday, 0);

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Bàn trực</h1>
          <p className="small muted">{longDate(d.today)}</p>
        </div>
        <div className="totals">
          <span>
            <b>{d.pending.length}</b> chờ duyệt
          </span>
          <span>
            <b>{d.approvedToday}</b> lượt hôm nay
          </span>
          <span>
            <b>{remaining}</b> chỗ còn lại
          </span>
        </div>
      </div>

      <Queue pending={d.pending} today={d.todayRows} />

      <section className="stack" style={{ marginTop: 34 }}>
        <div className="sec-head">
          <h2>Hai ngày tới</h2>
          <Link href="/chi-huy/lich">Lịch tiếp</Link>
        </div>
        <div className="rows" style={{ borderTop: 0 }}>
          {days.slice(0, 2).map((day) => (
            <div key={day.date} className="row">
              <div>
                <div className="who">
                  {weekdayShort(day.date)} · {monthDay(day.date)}
                </div>
                <div className="meta">
                  {day.closed ? day.reason : "Đang mở tiếp thân nhân"}
                </div>
              </div>
              <div className="when small">
                {day.loaded}/{day.capacity} lượt đã duyệt
              </div>
              <div>
                <Link href="/chi-huy/lich" className="btn btn-quiet btn-sm">
                  Xem lịch
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="stack" style={{ marginTop: 30 }}>
        <div className="sec-head">
          <h2>Việc thường dùng</h2>
        </div>
        <div className="btn-row">
          <Link href="/chi-huy/thong-bao" className="btn btn-ghost">
            Tạo thông báo tạm dừng
          </Link>
          <Link href="/chi-huy/quan-nhan" className="btn btn-ghost">
            Sổ quân nhân
          </Link>
          <Link href="/chi-huy/cai-dat" className="btn btn-ghost">
            Bật thông báo đẩy
          </Link>
        </div>
      </section>
    </>
  );
}
