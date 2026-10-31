import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getClasses, getSettings, getSoldiers, getUrgentDays } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đăng ký đột xuất" };

export default async function UrgentPage() {
  const [days, soldiers, classes, settings] = await Promise.all([
    getUrgentDays(),
    getSoldiers(),
    getClasses(),
    getSettings(),
  ]);

  const picks = days.map((d) => ({
    date: d.date,
    disabled: d.closed || d.count >= d.capacity,
    note: d.closed
      ? "Tạm dừng"
      : d.count >= d.capacity
        ? "Hết suất"
        : `Còn ${d.capacity - d.count} suất`,
  }));

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
            <h1>Đăng ký đột xuất</h1>
            <p className="lead">
              Dùng khi có việc gấp trong ngày hoặc ngày mai, ngoài lịch thứ Bảy,
              Chủ nhật. Đơn cần chỉ huy đại đội duyệt trước khi vào cổng.
            </p>
          </div>

          <div className="alert">
            <AlertCircle size={17} aria-hidden />
            <span>
              Suất đột xuất có hạn ({settings.capacity.urgent} lượt/ngày) và chỉ
              được duyệt khi đơn vị thực sự bố trí được. Đơn gửi ngoài giờ vẫn
              được ghi nhận cho ngày hôm sau.
            </span>
          </div>

          <RegistrationForm
            kind="urgent"
            soldiers={soldiers}
            classes={classes.map((c) => ({ id: c.id as string, name: c.name as string }))}
            days={picks}
            window={settings.visitWindow}
          />

          <p className="small muted">
            Việc không gấp thì{" "}
            <Link href="/dang-ky" style={{ fontWeight: 650 }}>
              đăng ký thứ Bảy hoặc Chủ nhật
            </Link>{" "}
            để đơn vị chuẩn bị chu đáo hơn.
          </p>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
