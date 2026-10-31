"use client";

import { Download } from "lucide-react";

export function ExportCsv({
  rows,
  filename,
}: {
  rows: (string | number)[][];
  filename: string;
}) {
  function download() {
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map((r) => r.map(escape).join(";")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={download}>
      <Download size={15} aria-hidden /> Xuất CSV
    </button>
  );
}
