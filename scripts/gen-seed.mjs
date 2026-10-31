// Sinh supabase/seed.sql từ roster.json của đơn vị.
// Chạy: node scripts/gen-seed.mjs "đường/dẫn/roster.json"
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("Thiếu đường dẫn roster.json");

const roster = JSON.parse(readFileSync(src, "utf8"));
const q = (v) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const CLASSES = [
  { id: "K2", name: "K2", short_name: "K2", sort_order: 1 },
  { id: "K3", name: "K3", short_name: "K3", sort_order: 2 },
  { id: "NVQYc43", name: "NVQYc43", short_name: "NVQY", sort_order: 3 },
];

const classOf = (className) => (className.startsWith("NVQY") ? "NVQYc43" : className);

const squads = [];
const seen = new Set();
for (const s of roster.squads) {
  const cls = classOf(s.classNames[0]);
  if (seen.has(s.key)) continue;
  seen.add(s.key);
  squads.push({
    id: s.key,
    class_id: cls,
    name: s.name,
    sort_order: Number(s.key.split("-").pop()) || 0,
  });
}

const counters = {};
const soldiers = roster.people.map((p) => {
  const cls = classOf(p.className);
  counters[cls] = (counters[cls] || 0) + 1;
  return {
    code: `${cls === "NVQYc43" ? "NVQY" : cls}-${String(counters[cls]).padStart(3, "0")}`,
    full_name: p.name,
    rank: p.rank || null,
    position: p.position || null,
    class_id: cls,
    squad_id: p.squadKey || null,
    phone: p.phone || null,
    address: p.address || null,
    note: p.note || null,
  };
});

const lines = [
  "-- seed.sql — danh sách quân nhân thật của đơn vị",
  "-- Sinh tự động từ roster.json. Chạy sau 0001_init.sql.",
  "",
  "insert into public.classes (id, name, short_name, sort_order) values",
  CLASSES.map((c) => `  (${q(c.id)}, ${q(c.name)}, ${q(c.short_name)}, ${c.sort_order})`).join(",\n"),
  "on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, sort_order = excluded.sort_order;",
  "",
  "insert into public.squads (id, class_id, name, sort_order) values",
  squads.map((s) => `  (${q(s.id)}, ${q(s.class_id)}, ${q(s.name)}, ${s.sort_order})`).join(",\n"),
  "on conflict (id) do update set class_id = excluded.class_id, name = excluded.name, sort_order = excluded.sort_order;",
  "",
  "insert into public.soldiers (code, full_name, rank, position, class_id, squad_id, phone, address, note) values",
  soldiers
    .map(
      (s) =>
        `  (${q(s.code)}, ${q(s.full_name)}, ${q(s.rank)}, ${q(s.position)}, ${q(s.class_id)}, ${q(s.squad_id)}, ${q(s.phone)}, ${q(s.address)}, ${q(s.note)})`,
    )
    .join(",\n"),
  "on conflict (code) do update set",
  "  full_name = excluded.full_name, rank = excluded.rank, position = excluded.position,",
  "  class_id = excluded.class_id, squad_id = excluded.squad_id, phone = excluded.phone,",
  "  address = excluded.address, note = excluded.note;",
  "",
];

writeFileSync("supabase/seed.sql", lines.join("\n"));
console.log(`OK: ${soldiers.length} quân nhân, ${squads.length} tiểu đội, ${CLASSES.length} lớp`);
