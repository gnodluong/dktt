import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RegistrationSummary } from "@/components/RegistrationSummary";
import { PushToggle } from "@/components/PushToggle";
import { getRequestByCode, getSettings } from "@/lib/data";
import { STATUS_LABEL, type Status } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Đăng ký ${code.toUpperCase()}` };
}

const HEADLINE: Record<Status, string> = {
  pending: "Đang chờ đại đội duyệt",
  approved: "Đại đội đã duyệt",
  checked_in: "Đã ghi nhận tiếp",
  rejected: "Đại đội chưa duyệt được",
  cancelled: "Đăng ký đã huỷ",
};

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ moi?: string }>;
}) {
  const { code } = await params;
  const { moi } = await searchParams;
  const [req, settings] = await Promise.all([getRequestByCode(code), getSettings()]);

  if (!req) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <div className="wrap">
            <div className="empty">
              <strong>Không tìm thấy đăng ký</strong>
              <p>
                Liên kết không đúng hoặc đăng ký đã bị xoá. Cần hỗ trợ, gọi{" "}
                {settings.contact.name} ({settings.contact.phone}).
              </p>
              <Link href="/" className="btn btn-ghost" style={{ marginTop: 8 }}>
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter contact={settings.contact} />
      </>
    );
  }

  const fresh = moi === "1";

  return (
    <>
      <SiteHeader />
      <main className="page-tight">
        <div className="wrap stack">
          {fresh ? (
            <div className="alert" data-tone="ok">
              <CheckCircle2 size={17} aria-hidden />
              <span>Đại đội đã nhận thông tin đăng ký của bạn.</span>
            </div>
          ) : null}

          <div className="stack-sm">
            <h1 style={{ fontSize: "clamp(1.5rem,4vw,2rem)" }}>
              {fresh ? "Cảm ơn bạn đã đăng ký" : "Đăng ký của bạn"}
            </h1>
            <p className="status-line" data-s={req.status}>
              <span className="dot" aria-hidden />
              {HEADLINE[req.status] ?? STATUS_LABEL[req.status]}
            </p>
            <p className="lead">
              {req.status === "pending"
                ? "Vui lòng chờ đại đội duyệt. Khi có kết quả, bạn sẽ nhận thông báo trên điện thoại."
                : req.status === "approved" || req.status === "checked_in"
                  ? `Mời bạn đến đúng ngày giờ đã đăng ký. Mang theo căn cước công dân.`
                  : "Liên hệ ban chỉ huy đại đội nếu cần hỗ trợ thêm."}
            </p>
          </div>

          <RegistrationSummary req={req} contact={settings.contact} />

          <div className="stack-sm no-print">
            <div className="sec-head" style={{ marginTop: 6 }}>
              <h2>Nhận kết quả trên điện thoại</h2>
            </div>
            <p className="small muted">
              Bật thông báo đẩy để biết ngay khi đại đội duyệt hoặc có thay đổi.
            </p>
            <PushToggle audience="family" requestCode={req.code} />
          </div>

          <div className="btn-row no-print">
            <Link href="/" className="btn btn-quiet">
              Trang chủ
            </Link>
            <Link href="/dang-ky" className="btn btn-quiet">
              Đăng ký thêm
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
