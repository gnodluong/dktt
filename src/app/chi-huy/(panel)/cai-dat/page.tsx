import { LogOut } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/lib/actions/staff";
import { ProfileForm, TestPushButton } from "@/components/ProfileForm";
import { PushToggle } from "@/components/PushToggle";
import { VisitWindowForm } from "@/components/VisitWindowForm";
import { configured, VAPID_PUBLIC } from "@/lib/env";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const profile = await requireStaff();
  const settings = await getSettings();

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Cài đặt</h1>
          <p className="small muted">{profile.email}</p>
        </div>
        <form action={signOut}>
          <button className="btn btn-ghost btn-sm" type="submit">
            <LogOut size={15} aria-hidden /> Đăng xuất
          </button>
        </form>
      </div>

      <div className="stack-lg">
        <section className="stack">
          <div className="sec-head">
            <h2>Tài khoản trực</h2>
          </div>
          <ProfileForm fullName={profile.full_name} phone={profile.phone ?? ""} />
          <p className="small muted">
            Vai trò:{" "}
            {profile.role === "admin"
              ? "Quản trị"
              : profile.role === "commander"
                ? "Chỉ huy"
                : "Trực ban"}
            . Đổi vai trò trong bảng <code>profiles</code> trên Supabase.
          </p>
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Khung giờ thăm</h2>
          </div>
          <VisitWindowForm
            start={settings.visitWindow.start}
            end={settings.visitWindow.end}
          />
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Thông báo đẩy trên thiết bị này</h2>
          </div>
          <p className="small muted">
            Bật để nhận phiếu mới ngay khi thân nhân gửi, kể cả khi không mở
            ứng dụng. Trên iPhone cần thêm ứng dụng vào Màn hình chính trước.
          </p>
          <div className="btn-row">
            <PushToggle audience="staff" />
            <TestPushButton />
          </div>
          {VAPID_PUBLIC ? null : (
            <p className="small err">
              Chưa cấu hình khoá VAPID trên máy chủ — thông báo đẩy chưa gửi
              được.
            </p>
          )}
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Đơn vị</h2>
          </div>
          <div className="rows" style={{ borderTop: 0 }}>
            <div className="row">
              <div className="who">{settings.unit.don_vi}</div>
              <div className="meta">{settings.unit.tieu_doan}</div>
              <div className="small muted">{settings.unit.truong}</div>
            </div>
            <div className="row">
              <div className="who">Sức chứa</div>
              <div className="meta">
                {settings.capacity.weekend} lượt/ngày · {settings.capacity.urgent}{" "}
                suất đột xuất/ngày
              </div>
              <div className="small muted">
                Đóng sổ lúc {settings.cutoffHour}:00 hôm trước
              </div>
            </div>
            <div className="row">
              <div className="who">Địa điểm tiếp</div>
              <div className="meta">{settings.contact.address}</div>
              <div className="small muted">
                {settings.contact.name} · {settings.contact.phone}
              </div>
            </div>
          </div>
          <p className="small muted">
            Sửa các giá trị này trong bảng <code>settings</code> trên Supabase
            (khoá <code>capacity</code>, <code>cutoff_hour</code>,{" "}
            <code>unit</code>).
          </p>
        </section>

        <section className="stack">
          <div className="sec-head">
            <h2>Tình trạng hệ thống</h2>
          </div>
          <div className="rows" style={{ borderTop: 0 }}>
            <div className="row">
              <div className="who">Supabase</div>
              <div className="meta">
                {configured ? "Đã kết nối" : "Thiếu SUPABASE_SECRET_KEY"}
              </div>
              <div className="small muted">/api/health</div>
            </div>
            <div className="row">
              <div className="who">Thông báo đẩy</div>
              <div className="meta">
                {VAPID_PUBLIC ? "Đã có khoá VAPID" : "Chưa có khoá VAPID"}
              </div>
              <div className="small muted">npm run vapid</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
