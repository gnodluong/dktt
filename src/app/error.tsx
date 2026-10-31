"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="stack">
          <h1 style={{ fontSize: "1.6rem" }}>Có lỗi khi tải trang</h1>
          <p className="lead">
            Có thể kết nối tới máy chủ dữ liệu bị gián đoạn. Thử lại; nếu vẫn lỗi,
            liên hệ trực ban đại đội.
          </p>
          {error.digest ? (
            <p className="tiny muted">Mã lỗi: {error.digest}</p>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Thử lại
            </button>
            <Link href="/" className="btn btn-ghost">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
