import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { FaturaYonu, FaturaDurumu } from "@/lib/enums";
import { KdvBeyanList } from "./kdv-list";

export const metadata = { title: "KDV Beyan" };
export const dynamic = "force-dynamic";

export default async function KdvBeyanPage({
  searchParams,
}: {
  searchParams: Promise<{ yil?: string; ay?: string }>;
}) {
  if (!(await isModuleActive("kdvBeyan"))) {
    return <ModuleClosed modulAd="KDV Beyan" />;
  }

  const orgId = await getOrgId();
  const { yil: yilParam, ay: ayParam } = await searchParams;

  // Geçerli tarih bilgisi (defaults)
  const bugun = new Date();
  const yil = parseYil(yilParam) ?? bugun.getFullYear();
  const ay = parseAy(ayParam) ?? bugun.getMonth() + 1; // 1-12

  const { ayBaslangic, ayBitis } = ayAraligi(yil, ay);

  // Aktif (iptal olmayan) faturaları o ay için çek
  const where = {
    organizationId: orgId,
    durum: { not: FaturaDurumu.Iptal } as never,
    tarih: {
      gte: ayBaslangic,
      lte: ayBitis,
    },
  };

  const [satisAgg, alisAgg, faturalar] = await Promise.all([
    db.fatura.aggregate({
      where: { ...where, yon: FaturaYonu.Gonderilen as never },
      _sum: { tutar: true, kdvTutari: true, toplamTutar: true },
      _count: { _all: true },
    }),
    db.fatura.aggregate({
      where: { ...where, yon: FaturaYonu.Gelen as never },
      _sum: { tutar: true, kdvTutari: true, toplamTutar: true },
      _count: { _all: true },
    }),
    db.fatura.findMany({
      where,
      orderBy: { tarih: "asc" },
      include: { cari: { select: { kod: true, unvan: true } } },
    }),
  ]);

  const satisKdv = Number(satisAgg._sum.kdvTutari ?? 0);
  const alisKdv = Number(alisAgg._sum.kdvTutari ?? 0);
  const satisAraToplam = Number(satisAgg._sum.tutar ?? 0);
  const alisAraToplam = Number(alisAgg._sum.tutar ?? 0);
  const net = satisKdv - alisKdv;

  const items = faturalar.map((f) => ({
    id: f.id,
    faturaNo: f.faturaNo,
    tarih: f.tarih.toISOString(),
    yon: f.yon,
    durum: f.durum,
    cari: f.cari ? { kod: f.cari.kod, unvan: f.cari.unvan } : null,
    araToplam: Number(f.tutar),
    kdvOrani: Number(f.kdvOrani),
    kdvTutari: Number(f.kdvTutari),
    toplamTutar: Number(f.toplamTutar),
    paraBirimi: f.paraBirimi,
  }));

  return (
    <KdvBeyanList
      yil={yil}
      ay={ay}
      ozet={{
        satisKdv,
        alisKdv,
        net,
        satisAraToplam,
        alisAraToplam,
        satisAdet: satisAgg._count._all,
        alisAdet: alisAgg._count._all,
      }}
      items={items}
    />
  );
}

function parseYil(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

function parseAy(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

/** Verilen yıl+ay için ayın ilk ve son anını döner. */
function ayAraligi(yil: number, ay: number): { ayBaslangic: Date; ayBitis: Date } {
  const ayBaslangic = new Date(yil, ay - 1, 1, 0, 0, 0, 0);
  // Son gün: bir sonraki ayın 0. günü
  const ayBitis = new Date(yil, ay, 0, 23, 59, 59, 999);
  return { ayBaslangic, ayBitis };
}
