import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { EtiketlerList } from "./etiketler-list";

export const metadata = { title: "Etiketler" };
export const dynamic = "force-dynamic";

export default async function EtiketlerPage() {
  const userId = await getUserId();
  const tags = await db.tag.findMany({
    where: { userId },
    orderBy: { ad: "asc" },
    include: { _count: { select: { cariler: true } } },
  });

  return (
    <EtiketlerList
      tags={tags.map((t) => ({
        id: t.id,
        ad: t.ad,
        renk: t.renk,
        aciklama: t.aciklama,
        kullanimSayisi: t._count.cariler,
      }))}
    />
  );
}
