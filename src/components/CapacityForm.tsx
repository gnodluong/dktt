"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import { saveCapacity } from "@/lib/actions/staff";
import type { FormState } from "@/lib/form";

export function CapacityForm({
  weekend,
  urgent,
}: {
  weekend: number;
  urgent: number;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    saveCapacity,
    null,
  );

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
          <label htmlFor="capWeekend">Lượt tiếp mỗi ngày</label>
          <input
            id="capWeekend"
            name="weekend"
            type="number"
            inputMode="numeric"
            min={0}
            max={2000}
            className="input"
            defaultValue={weekend}
            required
          />
          <span className="hint">Để 0 = không giới hạn.</span>
        </div>
        <div className="field">
          <label htmlFor="capUrgent">Suất đột xuất mỗi ngày</label>
          <input
            id="capUrgent"
            name="urgent"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            className="input"
            defaultValue={urgent}
            required
          />
        </div>
      </div>

      <p className="small muted">
        Đặt 0 để nhận không giới hạn lượt cuối tuần. Suất đột xuất vẫn giới hạn
        riêng để đơn vị chủ động bố trí.
      </p>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Users size={16} aria-hidden />
        {pending ? "Đang lưu…" : "Lưu sức chứa"}
      </button>
    </form>
  );
}
