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
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          placeholder="chihuy@daidoi5.vn"
          required
        />
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
