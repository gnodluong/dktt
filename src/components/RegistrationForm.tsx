"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { SoldierPicker } from "@/components/SoldierPicker";
import { submitVisit } from "@/lib/actions/public";
import {
  RELATIONS,
  fromMinutes,
  monthDay,
  timeSlots,
  toMinutes,
  weekdayShort,
  type Soldier,
} from "@/lib/domain";
import type { FormState } from "@/lib/form";

export interface DayPick {
  date: string;
  disabled: boolean;
  note: string;
}

function endOptions(start: string, end: string) {
  const out: string[] = [];
  const last = toMinutes(end);
  for (let m = toMinutes(start) + 30; m <= last; m += 30) out.push(fromMinutes(m));
  if (!out.includes(end) && last > toMinutes(start)) out.push(end);
  return [...new Set(out)];
}

export function RegistrationForm({
  kind,
  soldiers,
  classes,
  days,
  window: visitWindow,
  defaultDate,
  minDate,
  maxDate,
  minLeadDays = 2,
}: {
  kind: "weekend" | "urgent";
  soldiers: Soldier[];
  classes: { id: string; name: string }[];
  days: DayPick[];
  window: { start: string; end: string };
  defaultDate?: string;
  minDate?: string;
  maxDate?: string;
  minLeadDays?: number;
}) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    submitVisit,
    null,
  );

  const [from, setFrom] = useState(visitWindow.start);
  const [to, setTo] = useState(endOptions(visitWindow.start, visitWindow.end)[0]);

  const starts = useMemo(
    () => timeSlots(visitWindow.start, visitWindow.end),
    [visitWindow],
  );
  const ends = useMemo(() => endOptions(from, visitWindow.end), [from, visitWindow.end]);

  const fields = state?.fields ?? {};
  const invalid = (name: string) => (fields[name] ? "true" : undefined);
  const err = (name: string) =>
    fields[name] ? <span className="err">{fields[name]}</span> : null;

  const first = defaultDate ?? days.find((d) => !d.disabled)?.date ?? "";
  const openCount = days.filter((d) => !d.disabled).length;

  function changeFrom(v: string) {
    setFrom(v);
    if (toMinutes(to) <= toMinutes(v)) {
      const next = fromMinutes(toMinutes(v) + 30);
      setTo(endOptions(v, visitWindow.end).includes(next) ? next : visitWindow.end);
    }
  }

  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: -9999, width: 0, height: 0 }}
      />

      {state?.error ? (
        <div className="alert" data-tone="error" role="alert">
          <AlertCircle size={17} aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <fieldset className="group">
        <div className="group-head">
          <span className="n">01</span>
          <h2>Quân nhân được thăm</h2>
        </div>
        <SoldierPicker
          soldiers={soldiers}
          classes={classes}
          error={fields.soldierId}
        />
      </fieldset>

      <fieldset className="group">
        <div className="group-head">
          <span className="n">02</span>
          <h2>Ngày và giờ đến</h2>
        </div>

        {kind === "urgent" ? (
          <div className="field" data-invalid={invalid("visitDate")}>
            <label htmlFor="visitDate">
              Ngày mong muốn <span className="req">*</span>
            </label>
            <input
              id="visitDate"
              name="visitDate"
              type="date"
              className="input"
              min={minDate}
              max={maxDate}
              defaultValue={defaultDate ?? minDate}
              required
            />
            {err("visitDate")}
            <span className="hint">
              Chọn bất kỳ ngày nào trong 2 tuần tới, kể cả ngày thường.
            </span>
          </div>
        ) : openCount === 0 ? (
          <div className="alert" data-tone="error">
            <AlertCircle size={17} aria-hidden />
            <span>
              Hiện chưa có ngày nào đủ điều kiện đăng ký. Đơn vị cần báo trước{" "}
              {minLeadDays} ngày để chốt cơm và chuẩn bị — chọn ngày xa hơn hoặc
              liên hệ ban chỉ huy đại đội.
            </span>
          </div>
        ) : (
          <div className="days-pick" role="radiogroup" aria-label="Ngày đến thăm">
            {days.map((d) => (
              <label
                key={d.date}
                className="day-opt"
                style={d.disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                <input
                  type="radio"
                  name="visitDate"
                  value={d.date}
                  defaultChecked={d.date === first}
                  disabled={d.disabled}
                  required
                />
                <span className="box">
                  <span className="wd">{weekdayShort(d.date)}</span>
                  <span className="d">{monthDay(d.date)}</span>
                  <span className="cap">{d.note}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {err("visitDate")}

        <div className="grid-2">
          <div className="field" data-invalid={invalid("timeFrom")}>
            <label htmlFor="timeFrom">Từ giờ</label>
            <select
              id="timeFrom"
              name="timeFrom"
              className="select"
              value={from}
              onChange={(e) => changeFrom(e.target.value)}
            >
              {starts.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {err("timeFrom")}
          </div>
          <div className="field" data-invalid={invalid("timeTo")}>
            <label htmlFor="timeTo">Đến giờ</label>
            <select
              id="timeTo"
              name="timeTo"
              className="select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {ends.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {err("timeTo")}
          </div>
        </div>
        <span className="hint">
          Khung giờ thăm của đơn vị: {visitWindow.start} – {visitWindow.end}. Chọn
          khoảng thời gian bạn có mặt.
        </span>

        {kind === "urgent" ? (
          <div className="field" data-invalid={invalid("urgentReason")}>
            <label htmlFor="urgentReason">
              Lý do đột xuất <span className="req">*</span>
            </label>
            <textarea
              id="urgentReason"
              name="urgentReason"
              className="textarea"
              placeholder="Ví dụ: bố nhập viện cấp cứu, cần gặp con gấp trong ngày."
              required
              minLength={10}
            />
            {err("urgentReason")}
            <span className="hint">
              Đơn đột xuất cần chỉ huy duyệt. Bạn sẽ nhận thông báo khi có kết
              quả.
            </span>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="group">
        <div className="group-head">
          <span className="n">03</span>
          <h2>Người đến thăm</h2>
        </div>

        <div className="field" data-invalid={invalid("visitorName")}>
          <label htmlFor="visitorName">
            Họ và tên người đến thăm <span className="req">*</span>
          </label>
          <input
            id="visitorName"
            name="visitorName"
            className="input"
            autoComplete="name"
            placeholder="Nguyễn Thị Lan"
            required
          />
          {err("visitorName")}
        </div>

        <div className="grid-2">
          <div className="field" data-invalid={invalid("relation")}>
            <label htmlFor="relation">
              Quan hệ với quân nhân <span className="req">*</span>
            </label>
            <select id="relation" name="relation" className="select" required defaultValue="">
              <option value="" disabled>
                Chọn quan hệ
              </option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {err("relation")}
          </div>

          <div className="field" data-invalid={invalid("phone")}>
            <label htmlFor="phone">
              Số điện thoại <span className="req">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              required
            />
            {err("phone")}
          </div>
        </div>

        <div className="grid-2">
          <div className="field" data-invalid={invalid("idCard")}>
            <label htmlFor="idCard">Căn cước công dân</label>
            <input
              id="idCard"
              name="idCard"
              className="input"
              inputMode="numeric"
              placeholder="Không bắt buộc"
            />
            {err("idCard")}
          </div>

          <div className="field" data-invalid={invalid("companions")}>
            <label htmlFor="companions">
              Tổng số người đến <span className="req">*</span>
            </label>
            <input
              id="companions"
              name="companions"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              defaultValue={1}
              required
            />
            {err("companions")}
            <span className="hint">Tính cả bạn.</span>
          </div>
        </div>

        <div className="field" data-invalid={invalid("address")}>
          <label htmlFor="address">Địa chỉ</label>
          <input
            id="address"
            name="address"
            className="input"
            autoComplete="street-address"
            placeholder="Xã, huyện, tỉnh"
          />
          {err("address")}
        </div>

        <div className="field" data-invalid={invalid("purpose")}>
          <label htmlFor="purpose">Nội dung cần trao đổi</label>
          <textarea
            id="purpose"
            name="purpose"
            className="textarea"
            placeholder="Ví dụ: thăm hỏi sức khoẻ, gửi đồ tiếp tế."
          />
          {err("purpose")}
        </div>
      </fieldset>

      <p className="small muted">
        Thông tin chỉ dùng để đón tiếp tại cổng đại đội và xác nhận với chỉ huy.
        Mang theo căn cước khi đến.
      </p>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={pending || (kind === "weekend" && openCount === 0)}
      >
        {pending ? "Đang gửi…" : "Gửi đăng ký"}
        {pending ? null : <ArrowRight size={18} aria-hidden />}
      </button>
    </form>
  );
}
