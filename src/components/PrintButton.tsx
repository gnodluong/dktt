"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
      <Printer size={16} aria-hidden /> In phiếu
    </button>
  );
}
