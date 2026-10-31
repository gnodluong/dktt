import { STATUS_LABEL, type Status } from "@/lib/domain";

export function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "approved" || status === "checked_in"
      ? "ok"
      : status === "pending"
        ? "warn"
        : "stamp";
  return (
    <span className="pill" data-tone={tone}>
      {STATUS_LABEL[status]}
    </span>
  );
}
