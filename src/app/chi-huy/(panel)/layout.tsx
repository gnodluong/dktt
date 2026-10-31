import { requireStaff } from "@/lib/auth";
import { StaffNav } from "@/components/StaffNav";
import { admin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();

  let pending = 0;
  try {
    const { count } = await admin()
      .from("visit_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pending = count ?? 0;
  } catch {
    /* chưa cấu hình */
  }

  return (
    <div className="staff-shell">
      <StaffNav pending={pending} />
      <div className="staff-main">
        <div className="wrap-wide" style={{ padding: 0, maxWidth: "none" }}>
          {children}
        </div>
        <p className="tiny muted" style={{ marginTop: 40 }}>
          {profile.full_name} · {profile.role === "admin" ? "Quản trị" : profile.role === "commander" ? "Chỉ huy" : "Trực ban"}
        </p>
      </div>
    </div>
  );
}
