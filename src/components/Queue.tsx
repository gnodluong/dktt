"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Phone } from "lucide-react";
import { browser } from "@/lib/supabase/browser";
import { decide } from "@/lib/actions/staff";
import { StatusPill } from "@/components/StatusPill";
import {
  SESSIONS,
  classLabel,
  monthDay,
  squadLabel,
  weekdayShort,
  type VisitRequest,
} from "@/lib/domain";

export function Queue({
  pending,
  today,
}: {
  pending: VisitRequest[];
  today: VisitRequest[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const sb = browser();
    const channel = sb
      .channel(`dktt-bantruc-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visit_requests" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [router]);

  async function act(id: string, action: "approve" | "reject" | "checkin") {
    setBusy(`${id}:${action}`);
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("action", action);
    fd.set("note", notes[id] ?? "");
    try {
      const res = await decide(null, fd);
      if (res?.error) setError(res.error);
      else router.refresh();
    } catch {
      setError("Không lưu được quyết định. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="stack">
        <div className="sec-head">
          <h2>Chờ duyệt · {pending.length}</h2>
          <span className="tiny muted">Tự cập nhật khi có phiếu mới</span>
        </div>

        {pending.length === 0 ? (
          <div className="empty">
            <strong>Không còn phiếu chờ duyệt</strong>
            <p>Phiếu mới sẽ hiện ở đây và gửi thông báo đẩy tới điện thoại.</p>
          </div>
        ) : (
          pending.map((r) => (
            <article key={r.id} className="queue-item">
              <div className="queue-top">
                <div className="queue-who">
                  <strong>
                    {r.visitor_name}{" "}
                    <span className="muted" style={{ fontWeight: 500 }}>
                      · {r.relation}
                    </span>
                  </strong>
                  <span>
                    {r.soldier_rank ? `${r.soldier_rank} ` : ""}
                    {r.soldier_name} · {classLabel(r.class_id)}
                    {r.squad_id ? ` · ${squadLabel(r.squad_id)}` : ""}
                  </span>
                  <span>
                    <Phone size={12} aria-hidden style={{ display: "inline", verticalAlign: "-1px" }} />{" "}
                    <a href={`tel:${r.phone}`}>{r.phone}</a> · {r.companions} người
                  </span>
                </div>
                <div className="queue-when">
                  <b>
                    {weekdayShort(r.visit_date)} {monthDay(r.visit_date)}
                  </b>
                  {SESSIONS[r.session].label} ·{" "}
                  {r.kind === "urgent" ? "Đột xuất" : "Cuối tuần"}
                </div>
              </div>

              {r.urgent_reason ? (
                <p className="small">
                  <b>Lý do đột xuất:</b> {r.urgent_reason}
                </p>
              ) : null}
              {r.purpose ? <p className="small muted">{r.purpose}</p> : null}

              <div className="queue-actions">
                <input
                  className="input queue-note"
                  placeholder="Ghi chú gửi thân nhân (không bắt buộc)"
                  value={notes[r.id] ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                  }
                  aria-label={`Ghi chú cho phiếu của ${r.visitor_name}`}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => act(r.id, "approve")}
                  disabled={busy === `${r.id}:approve`}
                >
                  {busy === `${r.id}:approve` ? "Đang lưu…" : "Duyệt"}
                </button>
                <button
                  type="button"
                  className="btn btn-stamp btn-sm"
                  onClick={() => act(r.id, "reject")}
                  disabled={busy === `${r.id}:reject`}
                >
                  Từ chối
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="stack">
        <div className="sec-head">
          <h2>Hôm nay · {today.length}</h2>
        </div>
        {today.length === 0 ? (
          <p className="small muted">Hôm nay chưa có phiếu nào.</p>
        ) : (
          <div className="rows" style={{ borderTop: 0 }}>
            {today.map((r) => (
              <div key={r.id} className="row">
                <div>
                  <div className="who">
                    {r.visitor_name} · {r.relation}
                  </div>
                  <div className="meta">
                    {r.soldier_name} · {SESSIONS[r.session].label} · {r.companions} người
                  </div>
                </div>
                <div className="when small">
                  <StatusPill status={r.status} />
                </div>
                <div className="btn-row">
                  {r.status === "approved" ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => act(r.id, "checkin")}
                      disabled={busy === `${r.id}:checkin`}
                    >
                      Đã tiếp
                    </button>
                  ) : null}
                  <a href={`tel:${r.phone}`} className="btn btn-quiet btn-sm">
                    Gọi
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
