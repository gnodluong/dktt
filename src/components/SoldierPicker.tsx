"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { classLabel, squadLabel, type Soldier } from "@/lib/domain";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function SoldierPicker({
  soldiers,
  classes,
  error,
}: {
  soldiers: Soldier[];
  classes: { id: string; name: string }[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Soldier | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = plain(query.trim());
    return soldiers
      .filter((s) => (classId ? s.class_id === classId : true))
      .filter(
        (s) =>
          !q ||
          plain(s.full_name).includes(q) ||
          plain(classLabel(s.class_id)).includes(q) ||
          plain(squadLabel(s.squad_id)).includes(q),
      )
      .slice(0, 40);
  }, [query, classId, soldiers]);

  function choose(s: Soldier) {
    setSelected(s);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="field" data-invalid={Boolean(error)}>
      <label htmlFor="soldier-search">
        Quân nhân được thăm <span className="req">*</span>
      </label>

      <input type="hidden" name="soldierId" value={selected?.id ?? ""} />

      {selected ? (
        <div className="chosen">
          <div>
            <div className="who">{selected.full_name}</div>
            <div className="meta">
              {selected.rank ? `${selected.rank} · ` : ""}
              {classLabel(selected.class_id)}
              {selected.squad_id ? ` · ${squadLabel(selected.squad_id)}` : ""}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSelected(null);
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <X size={15} /> Đổi
          </button>
        </div>
      ) : (
        <div ref={boxRef} className="picker">
          <div className="picker-row-inputs">
            <select
              className="select picker-class"
              aria-label="Chọn lớp"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setOpen(true);
              }}
            >
              <option value="">Tất cả lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={17}
                aria-hidden
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              />
              <input
                ref={inputRef}
                id="soldier-search"
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Gõ họ tên hoặc tiểu đội"
                value={query}
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length > 0) {
                    e.preventDefault();
                    choose(results[0]);
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>
          </div>

          {open ? (
            <div
              className="picker-panel"
              id="soldier-list"
              role="group"
              aria-label="Kết quả tìm quân nhân"
            >
              {results.length === 0 ? (
                <div className="picker-empty">
                  Không tìm thấy. Đổi lớp hoặc gõ không dấu.
                </div>
              ) : (
                results.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="picker-row"
                    onClick={() => choose(s)}
                  >
                    <span className="who">{s.full_name}</span>
                    <span className="meta">
                      {s.rank ? `${s.rank} · ` : ""}
                      {classLabel(s.class_id)}
                      {s.squad_id ? ` · ${squadLabel(s.squad_id)}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}

      {error ? <span className="err">{error}</span> : null}
      <span className="hint">
        {soldiers.length} quân nhân trong sổ. Chọn lớp để thu hẹp danh sách.
      </span>
    </div>
  );
}
