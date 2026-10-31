import {
  classLabel,
  longDate,
  squadLabel,
  timeText,
  type VisitRequest,
} from "@/lib/domain";
import type { Contact } from "@/components/SiteChrome";

export function RegistrationSummary({
  req,
  contact,
}: {
  req: VisitRequest;
  contact: Contact;
}) {
  const person = [
    req.soldier_rank,
    req.soldier_name,
    req.class_id ? classLabel(req.class_id) : "",
    req.squad_id ? squadLabel(req.squad_id) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const rows: [string, string][] = [
    ["Quân nhân được thăm", person],
    ["Ngày đến", longDate(req.visit_date)],
    ["Giờ đến", timeText(req)],
    ["Người đến thăm", `${req.visitor_name} (${req.relation})`],
    ["Điện thoại", req.phone],
    ["Số người đến", `${req.companions} người`],
    ["Địa chỉ", req.address || "—"],
  ];

  if (req.kind === "urgent" && req.urgent_reason) {
    rows.push(["Lý do đột xuất", req.urgent_reason]);
  }
  if (req.purpose) rows.push(["Nội dung", req.purpose]);
  if (req.decision_note) rows.push(["Ghi chú của đơn vị", req.decision_note]);

  return (
    <div className="info-card">
      <dl className="info-rows">
        {rows.map(([label, value]) => (
          <div key={label} className="info-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="info-foot">
        <span className="info-label">Địa điểm tiếp</span>
        <span>{contact.address}</span>
        <span>
          Liên hệ {contact.name} ·{" "}
          <a href={`tel:${contact.phone}`}>{contact.phone}</a>
        </span>
      </div>
    </div>
  );
}
