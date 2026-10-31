import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, getSquads } from "@/lib/data";
import { SoldierForm } from "@/components/SoldierForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Thêm quân nhân" };

export default async function NewSoldierPage({
  searchParams,
}: {
  searchParams: Promise<{ lop?: string }>;
}) {
  await requireStaff();
  const { lop } = await searchParams;
  const [classes, squads] = await Promise.all([getClasses(), getSquads()]);

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Thêm quân nhân</h1>
          <p className="small muted">
            Quân nhân mới hiện ngay trong form đăng ký của thân nhân.
          </p>
        </div>
        <Link href="/chi-huy/quan-nhan" className="btn btn-quiet btn-sm">
          <ArrowLeft size={15} aria-hidden /> Sổ quân nhân
        </Link>
      </div>

      <SoldierForm
        classes={classes.map((c) => ({ id: c.id as string, name: c.name as string }))}
        squads={squads.map((s) => ({
          id: s.id as string,
          class_id: s.class_id as string,
          name: s.name as string,
        }))}
        defaultClass={lop}
      />
    </>
  );
}
