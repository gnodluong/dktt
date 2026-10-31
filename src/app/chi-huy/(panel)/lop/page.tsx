import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getAllSoldiers, getClasses, getSquads } from "@/lib/data";
import { NewClassForm, NewSquadForm } from "@/components/RosterAdmin";
import { toggleClass } from "@/lib/actions/manage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lớp & tiểu đội" };

export default async function ClassesPage() {
  await requireStaff();
  const [classes, squads, soldiers] = await Promise.all([
    getClasses(),
    getSquads(),
    getAllSoldiers(),
  ]);

  const countByClass = new Map<string, number>();
  for (const s of soldiers) {
    if (!s.class_id) continue;
    countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
  }

  return (
    <>
      <div className="staff-head">
        <div>
          <h1>Lớp &amp; tiểu đội</h1>
          <p className="small muted">
            Tạo lớp mới, thêm tiểu đội. Lớp mới tự hiện trong form đăng ký của
            thân nhân.
          </p>
        </div>
        <div className="btn-row">
          <Link href="/chi-huy/quan-nhan/nhap" className="btn btn-ghost btn-sm">
            Nhập danh sách
          </Link>
          <Link href="/chi-huy/quan-nhan/moi" className="btn btn-primary btn-sm">
            Thêm quân nhân
          </Link>
        </div>
      </div>

      <section className="stack" style={{ marginBottom: 34 }}>
        <div className="sec-head">
          <h2>Tạo lớp mới</h2>
        </div>
        <NewClassForm />
      </section>

      <div className="stack-lg">
        {classes.map((c) => {
          const list = squads.filter((s) => s.class_id === c.id);
          const total = countByClass.get(c.id as string) ?? 0;
          return (
            <section key={c.id} className="stack">
              <div className="sec-head">
                <h2>
                  {c.name} · {total} quân nhân · {list.length} tiểu đội
                </h2>
                <form action={toggleClass}>
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={(!c.active).toString()}
                  />
                  <button className="btn btn-quiet btn-sm" type="submit">
                    {c.active ? "Tạm ẩn lớp" : "Bật lại lớp"}
                  </button>
                </form>
              </div>

              {total === 0 ? (
                <p className="small muted">
                  Lớp chưa có quân nhân.{" "}
                  <Link href={`/chi-huy/quan-nhan/moi?lop=${c.id}`}>
                    Thêm quân nhân
                  </Link>{" "}
                  hoặc{" "}
                  <Link href="/chi-huy/quan-nhan/nhap">nhập danh sách</Link>.
                </p>
              ) : null}

              <div className="rows" style={{ borderTop: 0 }}>
                {list.map((s) => (
                  <div key={s.id} className="row">
                    <div className="who">{s.name}</div>
                    <div className="meta">
                      {
                        soldiers.filter((x) => x.squad_id === s.id).length
                      } quân nhân
                    </div>
                    <div className="small muted">{s.id}</div>
                  </div>
                ))}
              </div>

              <NewSquadForm classId={c.id as string} nextIndex={list.length + 1} />
            </section>
          );
        })}
      </div>
    </>
  );
}
