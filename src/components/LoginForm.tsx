"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { signIn } from "@/lib/actions/staff";
import type { FormState } from "@/lib/form";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    signIn,
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
        <label htmlFor="email">Tên đăng nhập</label>
        <input
          id="email"
          name="email"
          className="input"
          autoComplete="username"
          placeholder="Lê Văn Mạnh"
          required
        />
        <span className="hint">
          Gõ họ tên hoặc tên viết liền: Lê Văn Mạnh, Hồ Sỹ Long, Lương Trọng
          Toàn.
        </span>
      </div>

      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "Đang vào…" : "Vào bàn trực"}
        {pending ? null : <ArrowRight size={18} aria-hidden />}
      </button>
    </form>
  );
}
