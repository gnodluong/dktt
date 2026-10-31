"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, BellRing } from "lucide-react";
import { saveProfile, sendTestPush } from "@/lib/actions/staff";
import type { FormState } from "@/lib/form";

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    saveProfile,
    null,
  );

  return (
    <form action={action} className="form" style={{ maxWidth: 460 }}>
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

      <div className="field">
        <label htmlFor="fullName">Họ và tên</label>
        <input
          id="fullName"
          name="fullName"
          className="input"
          defaultValue={fullName}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Số điện thoại</label>
        <input
          id="phone"
          name="phone"
          className="input"
          type="tel"
          defaultValue={phone}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </form>
  );
}

export function TestPushButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await sendTestPush();
            setMsg(
              res.ok
                ? { ok: true, text: res.notice ?? "Đã gửi." }
                : { ok: false, text: res.error ?? "Không gửi được." },
            );
          })
        }
      >
        <BellRing size={16} aria-hidden />
        {pending ? "Đang gửi…" : "Gửi thông báo thử"}
      </button>
      {msg ? (
        <p className={msg.ok ? "small" : "small err"} role="status">
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
