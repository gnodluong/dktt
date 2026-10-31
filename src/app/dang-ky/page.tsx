import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getClasses, getDays, getSettings, getSoldiers } from "@/lib/data";
import { diffDays, todayVN } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đăng ký thăm thân" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string }>;
}) {
  const { ngay } = await searchParams;
  const [days, soldiers, classes, settings] = await Promise.all([
    getDays(3),
    getSoldiers(),
    getClasses(),
    getSettings(),
  ]);

  const today = todayVN();
  const picks = days.slice(0, 6).map((d) => {
    const full = d.capacity > 0 && d.loaded >= d.capacity;
    const tooClose = diffDays(today, d.date) < settings.minLeadDays;
    return {
      date: d.date,
      disabled: d.closed || full || tooClose,
      note: d.closed
        ? "Tạm dừng"
        : tooClose
          ? `Báo trước ${settings.minLeadDays} ngày`
          : full
            ? "Đã đủ lượt"
            : "Mở đăng ký",
    };
  });

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
            <h1>Đăng ký thăm thân</h1>
            <p className="lead">
              Chọn quân nhân, ngày và giờ đến. Sau khi gửi, bạn xem lại thông tin
              vừa nhập và chờ ban chỉ huy đại đội duyệt.
            </p>
          </div>

          <RegistrationForm
            kind="weekend"
            soldiers={soldiers}
            classes={classes.map((c) => ({ id: c.id as string, name: c.name as string }))}
            days={picks}
            window={settings.visitWindow}
            minLeadDays={settings.minLeadDays}
            defaultDate={
              ngay && picks.some((d) => d.date === ngay && !d.disabled) ? ngay : undefined
            }
          />

          <p className="small muted">
            Không đăng ký được ngày mong muốn?{" "}
            <Link href="/dang-ky/dot-xuat" style={{ fontWeight: 650 }}>
              Gửi đơn đột xuất
            </Link>{" "}
            hoặc liên hệ {settings.contact.name}
            {settings.contact.phone ? ` (${settings.contact.phone})` : ""}.
          </p>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
