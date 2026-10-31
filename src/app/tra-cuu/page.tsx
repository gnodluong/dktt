import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { LookupForm } from "@/components/LookupForm";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tra cứu phiếu" };

export default async function LookupPage() {
  const settings = await getSettings();

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
            <h1>Tra cứu phiếu</h1>
            <p className="lead">
              Xem trạng thái phiếu đã gửi và mở lại mã QR để vào cổng.
            </p>
          </div>

          <LookupForm />

          <p className="small muted">
            Quên mã phiếu? Liên hệ trực ban đại đội
            {settings.unit.hotline ? ` theo số ${settings.unit.hotline}` : ""} và
            đọc số điện thoại đã dùng khi đăng ký.
          </p>
        </div>
      </main>
      <SiteFooter hotline={settings.unit.hotline} />
    </>
  );
}
