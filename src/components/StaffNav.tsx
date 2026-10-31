"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";

const ITEMS = [
  { href: "/chi-huy", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/chi-huy/don", label: "Phiếu", icon: ClipboardList },
  { href: "/chi-huy/lich", label: "Lịch tiếp", icon: CalendarDays },
  { href: "/chi-huy/thong-bao", label: "Thông báo", icon: Megaphone },
  { href: "/chi-huy/quan-nhan", label: "Quân nhân", icon: Users },
  { href: "/chi-huy/cai-dat", label: "Cài đặt", icon: Settings },
];

export function StaffNav({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/chi-huy" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <aside className="side">
        <Link href="/chi-huy" className="brand">
          <span className="brand-mark" aria-hidden>
            Đ5
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
        {ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
