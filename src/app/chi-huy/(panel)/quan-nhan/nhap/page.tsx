import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ImportForm } from "@/components/RosterAdmin";
import { HEADERS } from "@/lib/roster-import";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nhập danh sách quân nhân" };

export default async function ImportPage() {
  await requireStaff();

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Nhập danh sách quân nhân</h1>
          <p className="small muted">
            Dùng file Excel hoặc bảng Word của đơn vị. Lớp và tiểu đội chưa có sẽ
            được tạo tự động.
          </p>
        </div>
        <Link href="/chi-huy/quan-nhan" className="btn btn-quiet btn-sm">
          <ArrowLeft size={15} aria-hidden /> Sổ quân nhân
        </Link>
      </div>

      <div className="stack-lg" style={{ maxWidth: 720 }}>
        <section className="stack">
          <div className="sec-head">
            <h2>1. Tải file mẫu</h2>
          </div>
          <div className="btn-row">
            <a
              href="/api/mau-nhap?dinh-dang=xlsx"
              className="btn btn-ghost"
              download
            >
              <Download size={16} aria-hidden /> Mẫu Excel (.xlsx)
            </a>
            <a
              href="/api/mau-nhap?dinh-dang=docx"
              className="btn btn-ghost"
              download
            >
              <Download size={16} aria-hidden /> Mẫu Word (.docx)
            </a>
          </div>
          <p className="small muted">
            File mẫu có 2 dòng ví dụ — xoá trước khi nhập danh sách thật. Có thể
            dùng bảng Word do đơn vị đang soạn, miễn là có dòng tiêu đề đúng tên
            cột.
          </p>
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>2. Chọn tệp và nhập</h2>
          </div>
          <ImportForm />
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Cột cần có</h2>
          </div>
          <div className="rows" style={{ borderTop: 0 }}>
            <div className="row">
              <div className="who">Bắt buộc</div>
              <div className="meta">Họ và tên, Lớp</div>
              <div className="small muted">Tên cột có dấu hay không dấu đều đọc được</div>
            </div>
            <div className="row">
              <div className="who">Không bắt buộc</div>
              <div className="meta">{HEADERS.filter((h) => !["Họ và tên", "Lớp"].includes(h)).join(", ")}</div>
              <div className="small muted">Thiếu cột nào thì để trống cột đó</div>
            </div>
            <div className="row">
              <div className="who">Trùng tên</div>
              <div className="meta">Cùng họ tên + cùng lớp = cập nhật</div>
              <div className="small muted">Không tạo bản ghi trùng</div>
            </div>
          </div>
        </section>

        <p className="small muted">
          Tệp Excel giữ nguyên dấu tiếng Việt tốt nhất. Với CSV, lưu dạng UTF-8.
          Tệp Word phải là .docx và chứa bảng.
        </p>
      </div>
    </>
  );
}
