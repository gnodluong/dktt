"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { classLabel, squadLabel, type Soldier } from "@/lib/domain";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function SoldierDirectory({
  soldiers,
  editable = false,
}: {
  soldiers: Soldier[];
  editable?: boolean;
}) {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = plain(q.trim());
    const list = needle
      ? soldiers.filter(
          (s) =>
            plain(s.full_name).includes(needle) ||
            plain(classLabel(s.class_id)).includes(needle) ||
            plain(squadLabel(s.squad_id)).includes(needle),
        )
      : soldiers;

    const map = new Map<string, Soldier[]>();
    for (const s of list) {
      const key = classLabel(s.class_id) || "Khác";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [q, soldiers]);

  const total = groups.reduce((n, [, arr]) => n + arr.length, 0);

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="q" className="label">
          Tìm quân nhân
        </label>
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
            id="q"
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Họ tên, lớp hoặc tiểu đội"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="hint">
          {total}/{soldiers.length} quân nhân
        </span>
      </div>

      {groups.map(([label, list]) => (
        <section key={label} className="stack">
          <div className="sec-head">
            <h2>
              {label} · {list.length}
            </h2>
          </div>
          <div className="rows" style={{ borderTop: 0 }}>
            {list.map((s) => (
              <div key={s.id} className="row">
                <div>
                  <div className="who">
                    {s.rank ? `${s.rank} · ` : ""}
                    {s.full_name}
                    {s.active === false ? (
                      <span className="pill" style={{ marginLeft: 8 }}>
                        Đã ẩn
                      </span>
                    ) : null}
                  </div>
                  <div className="meta">
                    {s.position ?? ""}
                    {s.squad_id ? ` · ${squadLabel(s.squad_id)}` : ""}
                  </div>
                </div>
                <div className="when small muted">
                  {s.code}
                  {s.phone ? <div className="tiny">{s.phone}</div> : null}
                </div>
                <div>
                  {editable ? (
                    <Link
                      href={`/chi-huy/quan-nhan/${s.id}`}
                      className="btn btn-quiet btn-sm"
                    >
                      Sửa
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {total === 0 ? (
        <div className="empty">
          <strong>Không tìm thấy</strong>
          <p>Thử gõ không dấu hoặc chỉ gõ tên.</p>
        </div>
      ) : null}
    </div>
  );
}
