"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { classLabel, squadLabel, type Soldier } from "@/lib/domain";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function SoldierPicker({
  soldiers,
  error,
}: {
  soldiers: Soldier[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Soldier | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = plain(query.trim());
    if (!q) return soldiers.slice(0, 24);
    return soldiers
      .filter(
        (s) =>
          plain(s.full_name).includes(q) ||
          plain(classLabel(s.class_id)).includes(q) ||
          plain(squadLabel(s.squad_id)).includes(q),
      )
      .slice(0, 40);
  }, [query, soldiers]);

  function choose(s: Soldier) {
    setSelected(s);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="field" data-invalid={Boolean(error)}>
      <label htmlFor="soldier-search">
        Họ tên quân nhân <span className="req">*</span>
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
        <div className="picker">
          <div style={{ position: "relative" }}>
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
              placeholder="Gõ họ tên, lớp hoặc tiểu đội"
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

          {open ? (
            <div
              className="picker-panel"
              id="soldier-list"
              role="group"
              aria-label="Kết quả tìm quân nhân"
            >
              {results.length === 0 ? (
                <div className="picker-empty">
                  Không tìm thấy. Thử gõ không dấu hoặc kiểm tra lại họ tên.
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
        Danh sách lấy từ sổ quân nhân của đại đội. Bạn có thể gõ không dấu.
      </span>
    </div>
  );
}
