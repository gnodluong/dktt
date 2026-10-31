"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { saveSoldier } from "@/lib/actions/manage";
import type { FormState } from "@/lib/form";
import type { Soldier } from "@/lib/domain";

export function SoldierForm({
  classes,
  squads,
  soldier,
  defaultClass,
}: {
  classes: { id: string; name: string }[];
  squads: { id: string; class_id: string; name: string }[];
  soldier?: Soldier;
  defaultClass?: string;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    saveSoldier,
    null,
  );
  const [classId, setClassId] = useState(
    soldier?.class_id ?? defaultClass ?? classes[0]?.id ?? "",
  );

  const options = squads.filter((s) => s.class_id === classId);

  return (
    <form action={action} className="form" style={{ maxWidth: 640 }}>
      {soldier ? <input type="hidden" name="id" value={soldier.id} /> : null}

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
          defaultValue={soldier?.full_name}
          placeholder="Nguyễn Văn An"
          required
          autoComplete="off"
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="classId">Lớp</label>
          <select
            id="classId"
            name="classId"
            className="select"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            required
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="squadId">Tiểu đội</label>
          <select
            id="squadId"
            name="squadId"
            className="select"
            defaultValue={soldier?.squad_id ?? ""}
            key={classId}
          >
            <option value="">Chưa xếp tiểu đội</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="rank">Cấp bậc</label>
          <input
            id="rank"
            name="rank"
            className="input"
            defaultValue={soldier?.rank ?? ""}
            placeholder="H2"
          />
        </div>
        <div className="field">
          <label htmlFor="position">Chức vụ</label>
          <input
            id="position"
            name="position"
            className="input"
            defaultValue={soldier?.position ?? ""}
            placeholder="HV"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="phone">Số điện thoại</label>
        <input
          id="phone"
          name="phone"
          className="input"
          type="tel"
          inputMode="tel"
          defaultValue={soldier?.phone ?? ""}
          placeholder="Không bắt buộc"
        />
      </div>

      <div className="field">
        <label htmlFor="address">Địa chỉ</label>
        <input
          id="address"
          name="address"
          className="input"
          defaultValue={soldier?.address ?? ""}
          placeholder="Xã, huyện, tỉnh"
        />
      </div>

      <div className="field">
        <label htmlFor="note">Ghi chú</label>
        <input
          id="note"
          name="note"
          className="input"
          defaultValue={soldier?.note ?? ""}
          placeholder="Không bắt buộc"
        />
      </div>

      {soldier ? (
        <label className="check" style={{ maxWidth: 260 }}>
          <input
            type="checkbox"
            name="active"
            defaultChecked={soldier.active !== false}
          />
          Đang theo học (bỏ tick để ẩn khỏi form đăng ký)
        </label>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Save size={16} aria-hidden />
        {pending ? "Đang lưu…" : soldier ? "Lưu thay đổi" : "Thêm quân nhân"}
      </button>
    </form>
  );
}
