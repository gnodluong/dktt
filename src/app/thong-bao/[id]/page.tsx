import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getNotice, getSettings } from "@/lib/data";
import { longDate, monthDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = await getNotice(id);
  return { title: notice?.title ?? "Thông báo" };
}

export default async function NoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [notice, settings] = await Promise.all([getNotice(id), getSettings()]);

  if (!notice) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <div className="wrap">
            <div className="empty">
              <strong>Không tìm thấy thông báo</strong>
              <Link href="/thong-bao" className="btn btn-ghost" style={{ marginTop: 8 }}>
                Xem tất cả thông báo
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter contact={settings.contact} />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="page-tight">
        <div className="wrap stack">
          <Link
            href="/thong-bao"
            className="small muted"
            style={{ textDecoration: "none", fontWeight: 600 }}
          >
            <ArrowLeft
              size={14}
              aria-hidden
              style={{ display: "inline", verticalAlign: "-2px" }}
            />{" "}
            Thông báo
          </Link>

          <article className="stack">
            <div className="stack-sm">
              <div className="btn-row">
                {notice.kind === "closure" ? (
                  <span className="pill" data-tone="stamp">
                    Tạm dừng tiếp
                  </span>
                ) : (
                  <span className="pill">Thông báo</span>
                )}
                {notice.active ? null : <span className="pill">Đã hết hiệu lực</span>}
              </div>
              <h1 style={{ fontSize: "clamp(1.5rem,4.4vw,2.1rem)" }}>{notice.title}</h1>
              {notice.start_date && notice.end_date ? (
                <p className="small muted">
                  Áp dụng từ {monthDay(notice.start_date)} đến{" "}
                  {monthDay(notice.end_date)}
                  {notice.class_ids?.length
                    ? ` · lớp ${notice.class_ids.join(", ")}`
                    : " · toàn đơn vị"}
                </p>
              ) : (
                <p className="small muted">
                  Đăng ngày {longDate(notice.created_at.slice(0, 10))}
                </p>
              )}
            </div>

            <div style={{ whiteSpace: "pre-wrap", fontSize: "1rem", lineHeight: 1.65 }}>
              {notice.body}
            </div>
          </article>

          <div className="btn-row">
            <Link href="/dang-ky" className="btn btn-primary">
              Đăng ký thăm thân
            </Link>
            <Link href="/tra-cuu" className="btn btn-ghost">
              Tra cứu phiếu
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
