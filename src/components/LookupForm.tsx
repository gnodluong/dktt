"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { lookupVisit } from "@/lib/actions/public";
import type { FormState } from "@/lib/form";

export function LookupForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    lookupVisit,
    null,
  );

  return (
    <form action={action} className="form">
      {state?.error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="code">Mã phiếu</label>
        <input
          id="code"
          name="code"
          className="input cond"
          placeholder="DK261108-4F2A"
          autoCapitalize="characters"
          autoComplete="off"
          required
          style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
        />
        <span className="hint">
          Mã in trên phiếu hẹn, dạng DK + ngày + 4 ký tự.
        </span>
      </div>

      <div className="field">
        <label htmlFor="phoneTail">3 số cuối điện thoại đã đăng ký</label>
        <input
          id="phoneTail"
          name="phoneTail"
          className="input"
          inputMode="numeric"
          maxLength={4}
          placeholder="678"
          autoComplete="off"
          required
        />
        <span className="hint">
          Dùng để bảo đảm chỉ người đăng ký xem được phiếu.
        </span>
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "Đang tra…" : "Xem phiếu"}
        {pending ? null : <ArrowRight size={18} aria-hidden />}
      </button>
    </form>
  );
}
