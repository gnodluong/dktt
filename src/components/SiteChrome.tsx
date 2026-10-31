import Link from "next/link";

export interface Contact {
  name: string;
  phone: string;
  address: string;
}

export function SiteHeader() {
  return (
    <header className="site-head">
      <div className="bar">
        <Link href="/" className="brand" aria-label="Đại đội 5 — trang chủ">
          <span className="brand-mark">
            <img
              src="/logo.png"
              alt="Logo Trường Cao đẳng Hậu cần 2"
              width={38}
              height={38}
            />
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
          <Link href="/thong-bao" className="head-link">
            Thông báo
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ contact }: { contact: Contact }) {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="inner">
          <span>
            Đại đội 5 · Tiểu đoàn 2 · Trường Cao đẳng Hậu cần 2
            <br />
            {contact.address} · Liên hệ {contact.name}:{" "}
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
          </span>
          <span>
            <Link href="/chi-huy/login">Dành cho chỉ huy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
