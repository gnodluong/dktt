import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đăng nhập chỉ huy" };

export default function LoginPage() {
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="stack">
          <div className="stack-sm">
            <div className="brand" style={{ marginBottom: 8 }}>
              <span className="brand-mark" aria-hidden>
                Đ5
              </span>
              <span>
                <span className="brand-name">Đại đội 5</span>
                <span className="brand-sub">Bàn trực chỉ huy</span>
              </span>
            </div>
            <h1 style={{ fontSize: "1.75rem" }}>Đăng nhập</h1>
            <p className="small muted">
              Dành cho chỉ huy và trực ban đại đội. Thân nhân không cần tài
              khoản — chỉ cần mã phiếu.
            </p>
          </div>

          <LoginForm />

          <p className="small muted">
            <Link href="/" style={{ fontWeight: 600 }}>
              ← Về trang thân nhân
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
