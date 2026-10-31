import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getDays, getSettings, getSoldiers } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đăng ký thăm thân" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string }>;
}) {
  const { ngay } = await searchParams;
  const [days, soldiers, settings] = await Promise.all([
    getDays(3),
    getSoldiers(),
    getSettings(),
  ]);

  const picks = days.slice(0, 6).map((d) => ({
    date: d.date,
    disabled: d.closed || d.loaded >= d.capacity,
    note: d.closed ? "Tạm dừng" : d.loaded >= d.capacity ? "Đã đủ lượt" : "Mở đăng ký",
  }));

  return (
    <>
      <SiteHeader />
      <main className="page-tight">
        <div className="wrap stack">
          <div className="stack-sm">
            <Link href="/" className="small muted" style={{ textDecoration: "none", fontWeight: 600 }}>
              <ArrowLeft size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
              Trang chủ
            </Link>
            <h1>Đăng ký thăm thân</h1>
            <p className="lead">
              Chọn quân nhân và ngày đến. Phiếu hiện ngay sau khi gửi; chỉ huy
              đại đội xác nhận và bạn nhận thông báo trên điện thoại.
            </p>
          </div>

          <RegistrationForm
            kind="weekend"
            soldiers={soldiers}
            days={picks}
            defaultDate={ngay}
          />

          <p className="small muted">
            Không đăng ký được ngày mong muốn?{" "}
            <Link href="/dang-ky/dot-xuat" style={{ fontWeight: 650 }}>
              Gửi đơn đột xuất
            </Link>{" "}
            hoặc liên hệ trực ban đại đội
            {settings.unit.hotline ? ` (${settings.unit.hotline})` : ""}.
          </p>
        </div>
      </main>
      <SiteFooter hotline={settings.unit.hotline} />
    </>
  );
}
