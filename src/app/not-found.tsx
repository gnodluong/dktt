import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="stack">
          <h1 style={{ fontSize: "1.6rem" }}>Không có trang này</h1>
          <p className="lead">
            Đường dẫn không đúng hoặc nội dung đã được chuyển đi.
          </p>
          <div className="btn-row">
            <Link href="/" className="btn btn-primary">
              Trang chủ
            </Link>
            <Link href="/dang-ky" className="btn btn-ghost">
              Đăng ký thăm thân
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
