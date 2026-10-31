"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { unlockResult } from "@/lib/actions/public";
import type { FormState } from "@/lib/form";

export function UnlockForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    unlockResult,
    null,
  );

  return (
    <form action={action} className="form" style={{ maxWidth: 460 }}>
      <input type="hidden" name="code" value={code} />

      {state?.error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="tail">4 số cuối điện thoại đã dùng để đăng ký</label>
        <input
          id="tail"
          name="tail"
          className="input"
          inputMode="numeric"
          maxLength={4}
          placeholder="5678"
          autoComplete="off"
          required
        />
        <span className="hint">
          Để bảo đảm chỉ người đăng ký xem được thông tin.
        </span>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Đang mở…" : "Xem đăng ký"}
        {pending ? null : <ArrowRight size={16} aria-hidden />}
      </button>
    </form>
  );
}
