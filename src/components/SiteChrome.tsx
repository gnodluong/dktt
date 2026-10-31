import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-head">
      <div className="bar">
        <Link href="/" className="brand" aria-label="Đại đội 5 — trang chủ">
          <span className="brand-mark" aria-hidden>
            Đ5
          </span>
          <span>
            <span className="brand-name">Đại đội 5</span>
            <span className="brand-sub">Sổ tiếp thân nhân</span>
          </span>
        </Link>
        <nav aria-label="Chính">
          <Link href="/dang-ky" className="head-link">
            Đăng ký
          </Link>
          <Link href="/tra-cuu" className="head-link">
            Tra cứu
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ hotline = "" }: { hotline?: string }) {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="inner">
          <span>
            Đại đội 5 · Tiểu đoàn 2 · Trường Cao đẳng Hậu cần 2
            {hotline ? ` · ${hotline}` : ""}
          </span>
          <span>
            <Link href="/chi-huy/login">Dành cho chỉ huy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
