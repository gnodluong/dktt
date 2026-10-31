"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Megaphone,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  mobile?: boolean;
};

const ITEMS: Item[] = [
  { href: "/chi-huy", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
  { href: "/chi-huy/don", label: "Lịch sử", icon: ClipboardList, mobile: true },
  { href: "/chi-huy/lich", label: "Lịch tiếp", icon: CalendarDays },
  { href: "/chi-huy/thong-bao", label: "Thông báo", icon: Megaphone, mobile: true },
  { href: "/chi-huy/quan-nhan", label: "Quân nhân", icon: Users, mobile: true },
  { href: "/chi-huy/lop", label: "Lớp & tiểu đội", icon: Layers },
  { href: "/chi-huy/cai-dat", label: "Cài đặt", icon: Settings },
];

export function StaffNav({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/chi-huy" ? pathname === href : pathname.startsWith(href);

  const mobileItems = ITEMS.filter((i) => i.mobile);
  const moreItems = ITEMS.filter((i) => !i.mobile);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      <aside className="side">
        <Link href="/chi-huy" className="brand">
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
            <span className="brand-sub">Bàn trực chỉ huy</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="nav-item"
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon size={17} aria-hidden />
              {label}
              {href === "/chi-huy" && pending > 0 ? (
                <span
                  className="pill"
                  data-tone="warn"
                  style={{ marginLeft: "auto" }}
                >
                  {pending}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="who">
          <Link href="/" className="small muted" style={{ textDecoration: "none" }}>
            ← Về trang thân nhân
          </Link>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Điều hướng">
        {mobileItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon aria-hidden />
            {label}
          </Link>
        ))}
        <button
          type="button"
          className="mobile-more"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Menu aria-hidden />
          Thêm
          {pending > 0 ? <span className="mobile-dot" aria-hidden /> : null}
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="menu-backdrop"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Thêm chức năng"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-head">
              <span className="menu-title">Chức năng khác</span>
              <button
                type="button"
                className="install-close"
                onClick={() => setMoreOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {moreItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="nav-item"
                aria-current={isActive(href) ? "page" : undefined}
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ))}

            <Link href="/" className="nav-item">
              <ClipboardList size={18} aria-hidden />
              Về trang thân nhân
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
