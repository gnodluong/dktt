import { requireStaff } from "@/lib/auth";
import { StaffNav } from "@/components/StaffNav";
import { admin } from "@/lib/supabase/admin";
import { getStaffTitle } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  const title = await getStaffTitle(profile.email);

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
        {children}
        <p className="tiny muted" style={{ marginTop: 40 }}>
          {profile.full_name}
          {title ? ` · ${title}` : ""}
        </p>
      </div>
    </div>
  );
}
