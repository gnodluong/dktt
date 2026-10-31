import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getNotices, getSettings } from "@/lib/data";
import { longDate, monthDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Thông báo" };

export default async function NoticesPage() {
  const [notices, settings] = await Promise.all([getNotices(30), getSettings()]);

  return (
    <>
      <SiteHeader />
      <main className="page-tight">
        <div className="wrap stack">
          <div className="stack-sm">
            <Link
              href="/"
              className="small muted"
              style={{ textDecoration: "none", fontWeight: 600 }}
            >
              <ArrowLeft
                size={14}
                aria-hidden
                style={{ display: "inline", verticalAlign: "-2px" }}
              />{" "}
              Trang chủ
            </Link>
            <h1>Thông báo</h1>
            <p className="lead">
              Lịch tạm dừng tiếp và các thay đổi từ đại đội.
            </p>
          </div>

          {notices.length === 0 ? (
            <div className="empty">
              <strong>Chưa có thông báo nào</strong>
              <p>Lịch tiếp thân nhân đang giữ như thường lệ.</p>
            </div>
          ) : (
            <div className="rows" style={{ borderTop: 0 }}>
              {notices.map((n) => (
                <Link
                  key={n.id}
                  href={`/thong-bao/${n.id}`}
                  className="row"
                  style={{ textDecoration: "none" }}
                >
                  <div>
                    <div className="who">{n.title}</div>
                    <div className="meta">
                      {n.kind === "closure" ? (
                        <span className="pill" data-tone="stamp" style={{ marginRight: 8 }}>
                          Tạm dừng
                        </span>
                      ) : null}
                      {n.start_date && n.end_date
                        ? `${monthDay(n.start_date)} – ${monthDay(n.end_date)}`
                        : longDate(n.created_at.slice(0, 10))}
                    </div>
                  </div>
                  <div className="when small muted">
                    {n.class_ids?.length
                      ? `Lớp ${n.class_ids.join(", ")}`
                      : "Toàn đơn vị"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
