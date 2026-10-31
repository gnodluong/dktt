"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { saveVisitWindow } from "@/lib/actions/staff";
import { fromMinutes } from "@/lib/domain";
import type { FormState } from "@/lib/form";

const OPTIONS = Array.from({ length: 21 }, (_, i) => fromMinutes(7 * 60 + i * 30));

export function VisitWindowForm({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    saveVisitWindow,
    null,
  );
  const [from, setFrom] = useState(start);

  return (
    <form action={action} className="form" style={{ maxWidth: 520 }}>
      {state?.error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state?.ok ? (
        <div className="alert" data-tone="ok">
          <CheckCircle2 size={17} aria-hidden />
          <span>{state.notice}</span>
        </div>
      ) : null}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="windowStart">Mở từ</label>
          <select
            id="windowStart"
            name="start"
            className="select"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="windowEnd">Đến</label>
          <select id="windowEnd" name="end" className="select" defaultValue={end}>
            {OPTIONS.filter((t) => t > from).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="small muted">
        Khung giờ này áp dụng cho mọi ngày tiếp thân nhân. Thân nhân chọn khoảng
        30 phút trong khung khi đăng ký.
      </p>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Clock size={16} aria-hidden />
        {pending ? "Đang lưu…" : "Lưu khung giờ"}
      </button>
    </form>
  );
}
