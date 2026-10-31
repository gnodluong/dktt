"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Plus, Upload } from "lucide-react";
import { createClass, createSquad, importRoster } from "@/lib/actions/manage";
import type { FormState } from "@/lib/form";

function Feedback({ state }: { state: FormState | null }) {
  if (state?.error) {
    return (
      <div className="alert" data-tone="error" role="alert">
        <AlertCircle size={17} aria-hidden />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state?.ok) {
    return (
      <div className="alert" data-tone="ok" role="status">
        <CheckCircle2 size={17} aria-hidden />
        <span>{state.notice}</span>
      </div>
    );
  }
  return null;
}

export function ImportForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    importRoster,
    null,
  );

  return (
    <form action={action} className="form" style={{ maxWidth: 620 }}>
      <Feedback state={state} />

      <div className="field">
        <label htmlFor="file">Tệp danh sách (.xlsx, .docx, .csv)</label>
        <input
          id="file"
          name="file"
          type="file"
          className="input"
          accept=".xlsx,.xlsm,.docx,.csv,.txt"
          required
          style={{ paddingTop: 10 }}
        />
        <span className="hint">
          Tệp Word cần có bảng; hệ thống đọc bảng đầu tiên. Với Excel, đọc trang
          tính đầu tiên.
        </span>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Upload size={16} aria-hidden />
        {pending ? "Đang nhập…" : "Nhập danh sách"}
      </button>
    </form>
  );
}

export function NewClassForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    createClass,
    null,
  );

  return (
    <form action={action} className="form" style={{ maxWidth: 520 }}>
      <Feedback state={state} />
      <div className="grid-2">
        <div className="field">
          <label htmlFor="code">Mã lớp</label>
          <input
            id="code"
            name="code"
            className="input"
            placeholder="K4"
            required
            maxLength={24}
          />
        </div>
        <div className="field">
          <label htmlFor="name">Tên lớp</label>
          <input
            id="name"
            name="name"
            className="input"
            placeholder="K4"
            maxLength={40}
          />
        </div>
      </div>
      <button type="submit" className="btn btn-ghost" disabled={pending}>
        <Plus size={16} aria-hidden />
        {pending ? "Đang tạo…" : "Thêm lớp"}
      </button>
    </form>
  );
}

export function NewSquadForm({
  classId,
  nextIndex = 1,
}: {
  classId: string;
  nextIndex?: number;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    createSquad,
    null,
  );

  return (
    <form action={action} className="btn-row" style={{ alignItems: "center" }}>
      <input type="hidden" name="classId" value={classId} />
      <input
        name="name"
        className="input"
        style={{ maxWidth: 220, minHeight: 38 }}
        placeholder={`Tiểu đội ${nextIndex}`}
        aria-label={`Thêm tiểu đội cho lớp ${classId}`}
        required
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
        <Plus size={15} aria-hidden />
        {pending ? "Đang thêm…" : "Thêm tiểu đội"}
      </button>
      {state?.error ? <span className="err">{state.error}</span> : null}
      {state?.ok ? <span className="small muted">{state.notice}</span> : null}
    </form>
  );
}
