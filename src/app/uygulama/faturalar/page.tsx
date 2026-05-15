import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { FaturaYonu, FaturaDurumu } from "@/lib/enums";
import { FaturaList } from "./fatura-list";
import { nextFaturaNo } from "./actions";

export const metadata = { title: "Faturalar" };
export const dynamic = "force-dynamic";

export default async function FaturalarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; yon?: string; durum?: string }>;
}) {
  if (!(await isModuleActive("faturalar"))) {
    return <ModuleClosed modulAd="Faturalar" />;
  }
  const orgId = await getOrgId();
  const { q = "", yon = "", durum = "" } = await searchParams;

  const where = {
    organizationId: orgId,
    ...(yon ? { yon: yon as never } : {}),
    ...(durum ? { durum: durum as never } : {}),
    ...(q
      ? {
          OR: [
            { faturaNo: { contains: q, mode: "insensitive" as const } },
            { isAciklamasi: { contains: q, mode: "insensitive" as const } },
            { cari: { unvan: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, cariler, stats, sonrakiNo, dekontSayilari] = await Promise.all([
    db.fatura.findMany({
      where,
      orderBy: { tarih: "desc" },
      include: { cari: { select: { kod: true, unvan: true } } },
    }),
    db.cari.findMany({
      where: { organizationId: orgId, aktif: true },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
    computeStats(orgId),
    nextFaturaNo(),
    db.dekont.groupBy({
      by: ["faturaId"],
      where: { organizationId: orgId, faturaId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const dekontMap = new Map<number, number>();
  for (const row of dekontSayilari) {
    if (row.faturaId != null) dekontMap.set(row.faturaId, row._count.id);
  }

  const serialized = items.map((f) => ({
    id: f.id,
    cariId: f.cariId,
    yon: f.yon,
    faturaNo: f.faturaNo,
    tarih: f.tarih.toISOString(),
    vadeTarihi: f.vadeTarihi?.toISOString() ?? null,
    isAciklamasi: f.isAciklamasi,
    tutar: f.tutar.toString(),
    kdvOrani: f.kdvOrani.toString(),
    kdvTutari: f.kdvTutari.toString(),
    toplamTutar: f.toplamTutar.toString(),
    odenenTutar: f.odenenTutar.toString(),
    paraBirimi: f.paraBirimi,
    durum: f.durum,
    notlar: f.notlar,
    cari: f.cari!,
    dekontSayisi: dekontMap.get(f.id) ?? 0,
  }));

  return (
    <FaturaList
      items={serialized}
      cariler={cariler}
      stats={stats}
      sonrakiNo={sonrakiNo}
    />
  );
}

async function computeStats(orgId: string) {
  const aktif = {
    organizationId: orgId,
    durum: { not: FaturaDurumu.Iptal as never },
  };
  const [gonderilen, gelen, bekleyen, adet] = await Promise.all([
    db.fatura.aggregate({
      where: { ...aktif, yon: FaturaYonu.Gonderilen as never },
      _sum: { toplamTutar: true },
    }),
    db.fatura.aggregate({
      where: { ...aktif, yon: FaturaYonu.Gelen as never },
      _sum: { toplamTutar: true },
    }),
    db.fatura.aggregate({
      where: {
        ...aktif,
        yon: FaturaYonu.Gonderilen as never,
        durum: {
          in: [FaturaDurumu.Beklemede, FaturaDurumu.KismiOdendi] as never,
        },
      },
      _sum: { toplamTutar: true, odenenTutar: true },
    }),
    db.fatura.count({ where: { organizationId: orgId } }),
  ]);

  return {
    gonderilen: Number(gonderilen._sum.toplamTutar ?? 0).toString(),
    gelen: Number(gelen._sum.toplamTutar ?? 0).toString(),
    bekleyen: (
      Number(bekleyen._sum.toplamTutar ?? 0) -
      Number(bekleyen._sum.odenenTutar ?? 0)
    ).toString(),
    adet,
  };
}
