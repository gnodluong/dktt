import { NextResponse } from "next/server";
import { buildDocxTemplate, buildXlsxTemplate } from "@/lib/roster-import";

export const dynamic = "force-dynamic";

/** Tải file mẫu danh sách quân nhân: /api/mau-nhap?dinh-dang=xlsx|docx */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("dinh-dang") ?? "xlsx";

  if (format === "docx") {
    return new NextResponse(new Blob([buildDocxTemplate()]), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition":
          'attachment; filename="mau-danh-sach-quan-nhan.docx"',
        "cache-control": "no-store",
      },
    });
  }

  const buffer = await buildXlsxTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition":
        'attachment; filename="mau-danh-sach-quan-nhan.xlsx"',
      "cache-control": "no-store",
    },
  });
}
