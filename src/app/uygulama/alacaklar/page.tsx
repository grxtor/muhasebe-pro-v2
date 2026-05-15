import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { OdemeYonu, OdemeDurumu } from "@/lib/enums";
import { OdemeNotuList } from "../_lib/odeme-notu-list";

export const metadata = { title: "Alacaklar" };
export const dynamic = "force-dynamic";

export default async function AlacaklarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  return loadView(searchParams, OdemeYonu.Alacak);
}

async function loadView(
  spPromise: Promise<{ q?: string; durum?: string }>,
  yon: typeof OdemeYonu.Alacak | typeof OdemeYonu.Borc,
) {
  const orgId = await getOrgId();
  const { q = "", durum = "" } = await spPromise;

  const where = {
    organizationId: orgId,
    yon: yon as never,
    ...(durum ? { durum: durum as never } : {}),
    ...(q
      ? {
          OR: [
            { baslik: { contains: q, mode: "insensitive" as const } },
            { aciklama: { contains: q, mode: "insensitive" as const } },
            { cari: { unvan: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, cariler, istatistikler] = await Promise.all([
    db.odemeNotu.findMany({
      where,
      orderBy: { vadeTarihi: "asc" },
      include: { cari: { select: { kod: true, unvan: true } } },
    }),
    db.cari.findMany({
      where: { organizationId: orgId, aktif: true },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
    computeStats(orgId, yon),
  ]);

  const serialized = items.map((o) => ({
    id: o.id,
    cariId: o.cariId,
    baslik: o.baslik,
    aciklama: o.aciklama,
    tutar: o.tutar.toString(),
    odenenTutar: o.odenenTutar.toString(),
    paraBirimi: o.paraBirimi,
    vadeTarihi: o.vadeTarihi.toISOString(),
    durum: o.durum,
    odemeTarihi: o.odemeTarihi?.toISOString() ?? null,
    cari: o.cari!,
  }));

  return (
    <OdemeNotuList
      yon={yon}
      items={serialized}
      cariler={cariler}
      istatistikler={istatistikler}
    />
  );
}

async function computeStats(
  orgId: string,
  yon: typeof OdemeYonu.Alacak | typeof OdemeYonu.Borc,
) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const acik = {
    organizationId: orgId,
    yon: yon as never,
    durum: { in: [OdemeDurumu.Beklemede, OdemeDurumu.KismiOdendi] as never },
  };

  const [agg, vadesiGecen, bekleyenAdet] = await Promise.all([
    db.odemeNotu.aggregate({
      where: acik,
      _sum: { tutar: true, odenenTutar: true },
    }),
    db.odemeNotu.count({
      where: { ...acik, vadeTarihi: { lt: bugun } },
    }),
    db.odemeNotu.count({ where: acik }),
  ]);

  const toplamBekleyen = (
    Number(agg._sum.tutar ?? 0) - Number(agg._sum.odenenTutar ?? 0)
  ).toString();

  return { toplamBekleyen, vadesiGecen, bekleyenAdet };
}
