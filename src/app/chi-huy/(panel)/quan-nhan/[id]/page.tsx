import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, getSoldier, getSquads } from "@/lib/data";
import { SoldierForm } from "@/components/SoldierForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sửa quân nhân" };

export default async function EditSoldierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [soldier, classes, squads] = await Promise.all([
    getSoldier(id),
    getClasses(),
    getSquads(),
  ]);

  if (!soldier) notFound();

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>{soldier.full_name}</h1>
          <p className="small muted">{soldier.code ?? "Chưa có mã quân nhân"}</p>
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
        soldier={soldier}
      />
    </>
  );
}
