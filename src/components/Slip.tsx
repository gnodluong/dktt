import { headers } from "next/headers";
import QRCode from "qrcode";
import {
  STATUS_LABEL,
  classLabel,
  longDate,
  squadLabel,
  timeText,
  type VisitRequest,
} from "@/lib/domain";

const TONE: Record<string, string | undefined> = {
  approved: undefined,
  pending: "pending",
  rejected: undefined,
  cancelled: "muted",
  checked_in: undefined,
};

export function Stamp({
  status,
  land = false,
}: {
  status: VisitRequest["status"];
  land?: boolean;
}) {
  const text =
    status === "checked_in"
      ? "Đã tiếp"
      : status === "cancelled"
        ? "Đã huỷ"
        : STATUS_LABEL[status];
  return (
    <span
      className={land ? "stamp land" : "stamp"}
      data-tone={TONE[status]}
      aria-label={`Trạng thái: ${STATUS_LABEL[status]}`}
    >
      {text}
      <small>Đại đội 5</small>
    </span>
  );
}

export async function Slip({
  req,
  fresh = false,
  contact,
}: {
  req: VisitRequest;
  fresh?: boolean;
  contact: { name: string; phone: string; address: string };
}) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/phieu/${req.code}`;

  let qr = "";
  try {
    qr = await QRCode.toString(url, {
      type: "svg",
      margin: 0,
      width: 240,
      errorCorrectionLevel: "M",
      color: { dark: "#1b2422", light: "#ffffff" },
    });
  } catch {
    qr = "";
  }

  return (
    <article className="slip">
      <div className="slip-main">
        <div className="slip-top">
          <div>
            <div className="slip-title">Phiếu tiếp thân nhân</div>
            <div className="slip-serial">{req.code}</div>
          </div>
          <Stamp status={req.status} land={fresh && req.status === "approved"} />
        </div>

        <div>
          <div className="slip-who">
            {req.visitor_name}{" "}
            <span className="muted small" style={{ fontWeight: 500 }}>
              ({req.relation})
            </span>
          </div>
          <div className="small muted">
            Đến thăm {req.soldier_rank ? `${req.soldier_rank} ` : ""}
            {req.soldier_name}
            {req.class_id ? ` · ${classLabel(req.class_id)}` : ""}
            {req.squad_id ? ` · ${squadLabel(req.squad_id)}` : ""}
          </div>
        </div>

        <dl className="slip-rows">
          <div className="slip-row">
            <dt>Ngày đến</dt>
            <dd>{longDate(req.visit_date)}</dd>
          </div>
          <div className="slip-row">
            <dt>Giờ đến</dt>
            <dd>{timeText(req)}</dd>
          </div>
          <div className="slip-row">
            <dt>Số người</dt>
            <dd>{req.companions} người</dd>
          </div>
          <div className="slip-row">
            <dt>Điện thoại</dt>
            <dd>{req.phone}</dd>
          </div>
          {req.kind === "urgent" && req.urgent_reason ? (
            <div className="slip-row">
              <dt>Lý do đột xuất</dt>
              <dd>{req.urgent_reason}</dd>
            </div>
          ) : null}
          {req.decision_note ? (
            <div className="slip-row">
              <dt>Ghi chú của đơn vị</dt>
              <dd>{req.decision_note}</dd>
            </div>
          ) : null}
        </dl>

        <div className="slip-contact">
          <span className="slip-title">Địa điểm</span>
          <div className="small">
            {contact.address}
            <br />
            Liên hệ: {contact.name} ·{" "}
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
          </div>
        </div>
      </div>

      <div className="slip-stub">
        <div className="stub-label">Quét mã tại cổng</div>
        <div
          className="qr"
          aria-hidden={!qr}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="stub-label">
          <span className="stub-code">{req.code}</span>
          <br />
          {req.visit_date.slice(8, 10)}/{req.visit_date.slice(5, 7)}
        </div>
      </div>
    </article>
  );
}
