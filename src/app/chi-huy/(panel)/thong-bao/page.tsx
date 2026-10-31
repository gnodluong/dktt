import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getClasses, getNotices } from "@/lib/data";
import { NoticeForm } from "@/components/NoticeForm";
import { toggleNotice } from "@/lib/actions/staff";
import { monthDay, upcomingWeekend, weekdayShort } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Thông báo" };

export default async function NoticesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tu?: string; den?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const [sat, sun] = upcomingWeekend();
  const [classes, notices] = await Promise.all([getClasses(), getNotices(20)]);

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Thông báo</h1>
          <p className="small muted">
            Tạm dừng tiếp theo ngày hoặc gửi thông báo chung tới thân nhân.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 34,
          alignItems: "start",
        }}
      >
        <section className="stack" style={{ maxWidth: 620 }}>
          <div className="sec-head">
            <h2>Tạo thông báo</h2>
          </div>
          <NoticeForm
            classes={classes.map((c) => ({ id: c.id as string, name: c.name as string }))}
            defaultStart={sp.tu ?? sat}
            defaultEnd={sp.den ?? sun}
          />
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Đã đăng · {notices.length}</h2>
            <Link href="/thong-bao">Xem trang thân nhân</Link>
          </div>

          {notices.length === 0 ? (
            <p className="small muted">Chưa có thông báo nào.</p>
          ) : (
            <div className="rows" style={{ borderTop: 0 }}>
              {notices.map((n) => (
                <div key={n.id} className="row">
                  <div>
                    <div className="who">
                      {n.title}{" "}
                      {n.active ? null : (
                        <span className="pill" style={{ marginLeft: 6 }}>
                          Đã tắt
                        </span>
                      )}
                    </div>
                    <div className="meta">
                      {n.kind === "closure" ? "Tạm dừng" : "Chung"}
                      {n.start_date && n.end_date
                        ? ` · ${monthDay(n.start_date)} – ${monthDay(n.end_date)}`
                        : ""}
                      {n.class_ids?.length
                        ? ` · lớp ${n.class_ids.join(", ")}`
                        : " · toàn đơn vị"}
                    </div>
                  </div>
                  <div className="when small muted">
                    {n.start_date
                      ? `${weekdayShort(n.start_date)} ${monthDay(n.start_date)}`
                      : ""}
                  </div>
                  <form action={toggleNotice}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="active" value={(!n.active).toString()} />
                    <button className="btn btn-quiet btn-sm" type="submit">
                      {n.active ? "Tắt" : "Bật lại"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
