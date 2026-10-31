import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDays, getSettings } from "@/lib/data";
import { monthDay, todayVN, weekdayName, weekdayShort } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lịch tiếp" };

export default async function SchedulePage() {
  await requireStaff();
  const [days, settings] = await Promise.all([getDays(6), getSettings()]);
  const today = todayVN();

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Lịch tiếp</h1>
          <p className="small muted">
            Thứ Bảy, Chủ nhật mở mặc định. Ngày có thông báo tạm dừng sẽ khoá
            đăng ký.
          </p>
        </div>
        <div className="totals">
          <span>
            <b>{settings.capacity.weekend}</b> lượt/ngày
          </span>
          <span>
            <b>{settings.capacity.urgent}</b> suất đột xuất/ngày
          </span>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="small muted">Chưa có ngày nào trong lịch.</p>
      ) : (
        <div className="rows">
          {days.map((d) => {
            const limited = d.capacity > 0;
            const pct = limited
              ? Math.min(100, Math.round((d.loaded / d.capacity) * 100))
              : 0;
            const isToday = d.date === today;
            return (
              <div key={d.date} className="row">
                <div>
                  <div className="who">
                    {weekdayName(d.date)} · {monthDay(d.date)}{" "}
                    {isToday ? <span className="pill">Hôm nay</span> : null}
                  </div>
                  <div className="meta">
                    {d.closed
                      ? `Tạm dừng: ${d.reason}`
                      : d.partial.length
                        ? `Một phần: ${d.partialReason} (lớp ${d.partial.join(", ")})`
                        : "Đang mở đăng ký"}
                  </div>
                  {limited ? (
                    <div
                      aria-hidden
                      style={{
                        marginTop: 8,
                        height: 4,
                        background: "var(--line)",
                        borderRadius: 2,
                        maxWidth: 260,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: d.closed ? "var(--stamp)" : "var(--accent)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="when small">
                  {limited
                    ? `${d.loaded}/${d.capacity} lượt`
                    : `${d.loaded} lượt đã đăng ký`}
                  {limited ? (
                    <div className="tiny muted">{pct}% sức chứa</div>
                  ) : null}
                </div>
                <div>
                  <Link
                    href={`/chi-huy/thong-bao?tu=${d.date}&den=${d.date}`}
                    className="btn btn-quiet btn-sm"
                  >
                    Báo tạm dừng
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="small muted" style={{ marginTop: 22 }}>
        {weekdayShort(today)} {monthDay(today)} · Sổ đăng ký ngày mai đóng lúc{" "}
        {settings.cutoffHour}:00 hôm nay.
      </p>
    </>
  );
}
