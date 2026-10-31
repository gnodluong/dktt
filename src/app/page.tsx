import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Megaphone, MapPin, Phone } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getDays, getNotices, getRequestByCode, getSettings } from "@/lib/data";
import { RESULT_COOKIE } from "@/lib/session";
import {
  STATUS_LABEL,
  diffDays,
  longDate,
  monthDay,
  timeText,
  todayVN,
  upcomingWeekend,
  weekdayName,
  weekdayShort,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

function stateOf(
  day: { date: string; closed: boolean; loaded: number; capacity: number },
  minLeadDays: number,
  today: string,
) {
  if (day.closed)
    return { state: "closed", text: "Tạm dừng tiếp", sub: "Theo thông báo của đơn vị" };
  const limited = day.capacity > 0;
  if (limited && day.loaded >= day.capacity)
    return { state: "full", text: "Đã đủ lượt", sub: `${day.loaded}/${day.capacity} lượt` };
  if (diffDays(today, day.date) < minLeadDays) {
    return {
      state: "late",
      text: "Hết hạn đăng ký",
      sub: `Cần báo trước ${minLeadDays} ngày`,
    };
  }
  return {
    state: "open",
    text: "Mở đăng ký",
    sub: limited
      ? `${day.loaded}/${day.capacity} lượt đã duyệt`
      : `${day.loaded} lượt đã đăng ký`,
  };
}

export default async function Home() {
  const today = todayVN();
  const [sat, sun] = upcomingWeekend(today);
  const [days, notices, settings, store] = await Promise.all([
    getDays(3),
    getNotices(3),
    getSettings(),
    cookies(),
  ]);

  const lastCode = store.get(RESULT_COOKIE)?.value;
  const recent = lastCode ? await getRequestByCode(lastCode) : null;

  const find = (d: string) =>
    days.find((x) => x.date === d) ?? {
      date: d,
      closed: false,
      reason: null as string | null,
      partial: [] as string[],
      partialReason: null as string | null,
      loaded: 0,
      capacity: settings.capacity.weekend,
    };

  const board = [find(sat), find(sun)];
  const closure = board.find((d) => d.closed);
  const partial = board.find((d) => d.partial.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <div className="wrap stack-lg">
          <section className="stack">
            <div className="stack-sm">
              <h1>Tiếp thân nhân</h1>
              <p className="lead">
                Đăng ký trước để ban chỉ huy đại đội chuẩn bị đón tiếp. Thứ Bảy
                và Chủ nhật mở sổ hằng tuần; việc gấp thì gửi đơn đột xuất để
                chỉ huy duyệt.
              </p>
              <p className="small muted">Hôm nay {longDate(today)}</p>
            </div>

            <div className="board">
              {board.map((d) => {
                const s = stateOf(d, settings.minLeadDays, today);
                const common = (
                  <>
                    <span className="wd">{weekdayName(d.date)}</span>
                    <span className="num">{monthDay(d.date)}</span>
                    <span className="status">{s.text}</span>
                    <span className="sub">{s.sub}</span>
                  </>
                );
                return d.closed || s.state === "late" ? (
                  <div key={d.date} className="board-day" data-state={s.state}>
                    {common}
                  </div>
                ) : (
                  <Link
                    key={d.date}
                    href={`/dang-ky?ngay=${d.date}`}
                    className="board-day"
                    data-state={s.state}
                    aria-label={`Đăng ký thăm ${weekdayName(d.date)} ${monthDay(d.date)}`}
                  >
                    {common}
                  </Link>
                );
              })}
            </div>

            {closure ? (
              <p className="weekend-note">
                <Megaphone
                  size={15}
                  aria-hidden
                  style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }}
                />
                {weekdayName(closure.date)} {monthDay(closure.date)} tạm dừng tiếp:{" "}
                <b>{closure.reason}</b>.
              </p>
            ) : null}

            {partial ? (
              <p className="weekend-note">
                <Megaphone
                  size={15}
                  aria-hidden
                  style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }}
                />
                {partial.partialReason} — áp dụng cho lớp{" "}
                <b>{partial.partial.join(", ")}</b>.
              </p>
            ) : null}

            <div className="actions">
              <Link href="/dang-ky" className="btn btn-primary btn-lg">
                Đăng ký thăm thân
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/dang-ky/dot-xuat" className="btn btn-ghost btn-lg">
                Đơn đột xuất
              </Link>
            </div>

            {recent ? (
              <Link href={`/dang-ky/ket-qua/${recent.code}`} className="recent-line">
                <span className="recent-label">Đăng ký gần đây</span>
                <span className="recent-main">
                  {STATUS_LABEL[recent.status]} · {weekdayShort(recent.visit_date)}{" "}
                  {monthDay(recent.visit_date)} · {timeText(recent)}
                </span>
                <ArrowRight size={16} aria-hidden />
              </Link>
            ) : null}

            <div className="facts">
              <span>
                <MapPin size={15} aria-hidden /> {settings.contact.address}
              </span>
              <span>
                <Phone size={15} aria-hidden /> {settings.contact.name} ·{" "}
                <a href={`tel:${settings.contact.phone}`}>{settings.contact.phone}</a>
              </span>
              <span>
                Giờ thăm: {settings.visitWindow.start} – {settings.visitWindow.end}
              </span>
            </div>
          </section>

          {notices.length > 0 ? (
            <section className="stack">
              <div className="sec-head">
                <h2>Thông báo từ đại đội</h2>
                <Link href="/thong-bao">Xem tất cả</Link>
              </div>
              <div>
                {notices.map((n) => (
                  <Link key={n.id} href={`/thong-bao/${n.id}`} className="notice-item">
                    <span className="meta">
                      {n.kind === "closure" ? (
                        <span className="tag">Tạm dừng tiếp</span>
                      ) : null}
                      {n.start_date && n.end_date ? (
                        <span>
                          {monthDay(n.start_date)} – {monthDay(n.end_date)}
                        </span>
                      ) : null}
                    </span>
                    <h3>{n.title}</h3>
                    <p>
                      {n.body.slice(0, 150)}
                      {n.body.length > 150 ? "…" : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="stack">
            <div className="sec-head">
              <h2>Khi đến đơn vị</h2>
            </div>
            <ol className="steps">
              <li>
                <span className="n">01</span>
                <span>
                  <b>Đăng ký trước.</b> Gửi đăng ký trước 20:00 hôm trước, hoặc
                  gửi đơn đột xuất nếu có việc gấp.
                </span>
              </li>
              <li>
                <span className="n">02</span>
                <span>
                  <b>Chờ chỉ huy duyệt.</b> Bật thông báo đẩy để nhận kết quả
                  ngay trên điện thoại.
                </span>
              </li>
              <li>
                <span className="n">03</span>
                <span>
                  <b>Đến cổng đúng giờ.</b> Mang theo căn cước, cho biết tên
                  quân nhân và giờ đã đăng ký; số người đi cùng phải đúng như
                  khai.
                </span>
              </li>
            </ol>
          </section>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
