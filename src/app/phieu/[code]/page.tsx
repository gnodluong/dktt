import Link from "next/link";
import { CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Slip } from "@/components/Slip";
import { PushToggle } from "@/components/PushToggle";
import { PrintButton } from "@/components/PrintButton";
import { getRequestByCode, getSettings } from "@/lib/data";
import { STATUS_LABEL, monthDay, timeText, weekdayShort } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Phiếu ${code.toUpperCase()}` };
}

export default async function SlipPage({
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
              <strong>Không tìm thấy phiếu</strong>
              <p>
                Mã <b>{code}</b> không có trong sổ đăng ký. Kiểm tra lại liên kết
                hoặc liên hệ {settings.contact.name} ({settings.contact.phone}).
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
  const approved = req.status === "approved" || req.status === "checked_in";

  return (
    <>
      <SiteHeader />
      <main className="page-tight">
        <div className="wrap stack">
          {fresh ? (
            <div className="alert" data-tone="ok">
              <CheckCircle2 size={17} aria-hidden />
              <span>
                Đã gửi phiếu. Giữ mã <b>{req.code}</b> — bạn cần mã này khi đến
                cổng.
              </span>
            </div>
          ) : null}

          <div className="stack-sm">
            <h1 style={{ fontSize: "clamp(1.5rem,4vw,2rem)" }}>
              {STATUS_LABEL[req.status]}
            </h1>
            <p className="lead">
              {approved
                ? `${weekdayShort(req.visit_date)} ${monthDay(req.visit_date)} · ${timeText(
                    req,
                  )} — mời bạn đến đúng khung giờ đã đăng ký.`
                : req.status === "pending"
                  ? "Phiếu đang chờ chỉ huy đại đội duyệt. Bạn sẽ nhận thông báo khi có kết quả."
                  : "Phiếu không còn hiệu lực. Liên hệ ban chỉ huy đại đội nếu cần hỗ trợ."}
            </p>
          </div>

          <Slip req={req} fresh={fresh && approved} contact={settings.contact} />

          {approved ? (
            <div className="facts">
              <span>
                <MapPin size={15} aria-hidden /> {settings.contact.address}
              </span>
              <span>
                <Phone size={15} aria-hidden /> {settings.contact.name} ·{" "}
                <a href={`tel:${settings.contact.phone}`}>{settings.contact.phone}</a>
              </span>
            </div>
          ) : null}

          <div className="stack-sm no-print">
            <div className="sec-head" style={{ marginTop: 6 }}>
              <h2>Nhận kết quả trên điện thoại</h2>
            </div>
            <p className="small muted">
              Bật thông báo đẩy để biết ngay khi chỉ huy duyệt hoặc khi đơn vị có
              thông báo thay đổi.
            </p>
            <PushToggle audience="family" requestCode={req.code} />
          </div>

          <div className="btn-row no-print">
            <PrintButton />
            <Link href="/" className="btn btn-quiet">
              Trang chủ
            </Link>
          </div>

          <p className="tiny muted">
            <Clock
              size={13}
              aria-hidden
              style={{ display: "inline", verticalAlign: "-2px" }}
            />{" "}
            Phiếu chỉ có giá trị khi trạng thái “Đã duyệt”. Mang theo căn cước
            công dân khi đến.
          </p>
        </div>
      </main>
      <SiteFooter contact={settings.contact} />
    </>
  );
}
