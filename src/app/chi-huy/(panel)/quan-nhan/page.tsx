import { requireStaff } from "@/lib/auth";
import { getClasses, getSoldiers } from "@/lib/data";
import { SoldierDirectory } from "@/components/SoldierDirectory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sổ quân nhân" };

export default async function SoldiersPage() {
  await requireStaff();
  const [soldiers, classes] = await Promise.all([getSoldiers(), getClasses()]);
  const withPhone = soldiers.filter((s) => s.phone).length;

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Sổ quân nhân</h1>
          <p className="small muted">
            {soldiers.length} quân nhân · {classes.length} lớp · {withPhone} số
            điện thoại đã có
          </p>
        </div>
      </div>
      <SoldierDirectory soldiers={soldiers} />
    </>
  );
}
