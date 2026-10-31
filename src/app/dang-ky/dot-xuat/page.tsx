import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getClasses, getSettings, getSoldiers } from "@/lib/data";
import { addDays, todayVN } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đơn đột xuất" };

export default async function UrgentPage() {
  const today = todayVN();
  const [soldiers, classes, settings] = await Promise.all([
    getSoldiers(),
    getClasses(),
    getSettings(),
  ]);

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
            <h1>Đơn đột xuất</h1>
            <p className="lead">
              Dùng khi cần gặp ngoài lịch thứ Bảy, Chủ nhật — chọn ngày bất kỳ
              trong 2 tuần tới. Đơn cần chỉ huy đại đội duyệt trước khi vào cổng.
            </p>
          </div>

          <div className="alert">
            <AlertCircle size={17} aria-hidden />
            <span>
              Suất đột xuất có hạn ({settings.capacity.urgent} lượt/ngày) và chỉ
              được duyệt khi đơn vị thực sự bố trí được. Nêu rõ việc cần làm để
              chỉ huy quyết định nhanh.
            </span>
          </div>

          <RegistrationForm
            kind="urgent"
            soldiers={soldiers}
            classes={classes.map((c) => ({ id: c.id as string, name: c.name as string }))}
            days={[]}
            window={settings.visitWindow}
            minDate={today}
            maxDate={addDays(today, 14)}
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
