import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getAllSoldiers, getClasses } from "@/lib/data";
import { SoldierDirectory } from "@/components/SoldierDirectory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sổ quân nhân" };

export default async function SoldiersPage() {
  await requireStaff();
  const [soldiers, classes] = await Promise.all([getAllSoldiers(), getClasses()]);
  const withPhone = soldiers.filter((s) => s.phone).length;
  const active = soldiers.filter((s) => s.active !== false).length;

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Sổ quân nhân</h1>
          <p className="small muted">
            {soldiers.length} người · {active} đang theo học · {classes.length} lớp
            · {withPhone} số điện thoại
          </p>
        </div>
        <div className="btn-row">
          <Link href="/chi-huy/lop" className="btn btn-ghost btn-sm">
            Lớp &amp; tiểu đội
          </Link>
          <Link href="/chi-huy/quan-nhan/nhap" className="btn btn-ghost btn-sm">
            Nhập danh sách
          </Link>
          <Link href="/chi-huy/quan-nhan/moi" className="btn btn-primary btn-sm">
            Thêm quân nhân
          </Link>
        </div>
      </div>
      <SoldierDirectory soldiers={soldiers} editable />
    </>
  );
}
