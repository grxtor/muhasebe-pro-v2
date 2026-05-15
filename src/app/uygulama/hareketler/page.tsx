import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { HareketTipi } from "@/lib/enums";
import { HareketList } from "./hareket-list";

export const metadata = { title: "Hareketler" };
export const dynamic = "force-dynamic";

export default async function HareketlerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tip?: string }>;
}) {
  const userId = await getUserId();
  const { q = "", tip = "" } = await searchParams;

  const where = {
    userId,
    ...(tip ? { tip: tip as never } : {}),
    ...(q
      ? {
          OR: [
            { aciklama: { contains: q, mode: "insensitive" as const } },
            { cari: { unvan: { contains: q, mode: "insensitive" as const } } },
            { belgeNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, alacakSum, borcSum] = await Promise.all([
    db.hareket.findMany({
      where,
      orderBy: { tarih: "desc" },
      take: 500,
      include: { cari: { select: { kod: true, unvan: true } } },
    }),
    db.hareket.aggregate({
      where: { userId, tip: HareketTipi.Alacak as never },
      _sum: { tutar: true },
    }),
    db.hareket.aggregate({
      where: { userId, tip: HareketTipi.Borc as never },
      _sum: { tutar: true },
    }),
  ]);

  const serialized = items.map((h) => ({
    id: h.id,
    cariId: h.cariId,
    tarih: h.tarih.toISOString(),
    tip: h.tip,
    tutar: h.tutar.toString(),
    paraBirimi: h.paraBirimi,
    aciklama: h.aciklama,
    belgeNo: h.belgeNo,
    cari: h.cari!,
  }));

  return (
    <HareketList
      items={serialized}
      toplamAlacak={Number(alacakSum._sum.tutar ?? 0).toString()}
      toplamBorc={Number(borcSum._sum.tutar ?? 0).toString()}
    />
  );
}
