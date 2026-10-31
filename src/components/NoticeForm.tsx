"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Megaphone } from "lucide-react";
import { publishNotice } from "@/lib/actions/staff";
import type { FormState } from "@/lib/form";

export function NoticeForm({
  classes,
  defaultStart,
  defaultEnd,
}: {
  classes: { id: string; name: string }[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    publishNotice,
    null,
  );
  const [kind, setKind] = useState<"closure" | "general">("closure");

  return (
    <form action={action} className="form">
      {state?.error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state?.ok ? (
        <div className="alert" data-tone="ok" role="status">
          <CheckCircle2 size={17} aria-hidden />
          <span>{state.notice}</span>
        </div>
      ) : null}

      <div className="field">
        <span className="label">Loại thông báo</span>
        <div className="segment">
          <label className="seg">
            <input
              type="radio"
              name="kind"
              value="closure"
              defaultChecked
              onChange={() => setKind("closure")}
            />
            <span>
              Tạm dừng tiếp
              <small>Khoá ngày trong lịch</small>
            </span>
          </label>
          <label className="seg">
            <input
              type="radio"
              name="kind"
              value="general"
              onChange={() => setKind("general")}
            />
            <span>
              Thông báo chung
              <small>Không khoá lịch</small>
            </span>
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Tiêu đề</label>
        <input
          id="title"
          name="title"
          className="input"
          placeholder="Tạm dừng tiếp thân nhân ngày 08/11"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="body">Nội dung</label>
        <textarea
          id="body"
          name="body"
          className="textarea"
          placeholder="Lý do và hướng dẫn cho thân nhân. Ví dụ: đơn vị đi huấn luyện dã ngoại, đề nghị thân nhân chuyển sang tuần sau hoặc liên hệ trực ban."
          required
          style={{ minHeight: 120 }}
        />
      </div>

      {kind === "closure" ? (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="startDate">Từ ngày</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="input"
              defaultValue={defaultStart}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="endDate">Đến ngày</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="input"
              defaultValue={defaultEnd}
              required
            />
          </div>
        </div>
      ) : null}

      <div className="field">
        <span className="label">Phạm vi</span>
        <div className="checks">
          {classes.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" name="classIds" value={c.id} />
              {c.name}
            </label>
          ))}
        </div>
        <span className="hint">
          Không tick lớp nào = áp dụng toàn đơn vị. Tick lớp nào thì chỉ lớp đó
          tạm dừng.
        </span>
      </div>

      <label className="check" style={{ maxWidth: 380 }}>
        <input type="checkbox" name="push" defaultChecked />
        Gửi thông báo đẩy tới thân nhân
      </label>

      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        <Megaphone size={17} aria-hidden />
        {pending ? "Đang đăng…" : "Đăng thông báo"}
      </button>
    </form>
  );
}
