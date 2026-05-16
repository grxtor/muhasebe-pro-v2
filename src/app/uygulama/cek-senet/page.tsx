import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { CekSenetYon, CekSenetDurum } from "@/lib/enums";
import {
  isCekSenetTip,
  isCekSenetYon,
  isCekSenetDurum,
} from "@/lib/schemas/cek-senet";
import { CekSenetList, type CekSenetRow, type CariRef } from "./cek-senet-list";

export const metadata = { title: "Çek / Senet" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  tip?: string;
  yon?: string;
  durum?: string;
  yeni?: string;
}

export default async function CekSenetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isModuleActive("cekSenet"))) {
    return <ModuleClosed modulAd="Çek / Senet" />;
  }

  const orgId = await getOrgId();
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const tip = isCekSenetTip(sp.tip) ? sp.tip : null;
  const yon = isCekSenetYon(sp.yon) ? sp.yon : null;
  const durum = isCekSenetDurum(sp.durum) ? sp.durum : null;
  const autoOpenYeni = sp.yeni === "1";

  const where: Prisma.CekSenetWhereInput = {
    organizationId: orgId,
    ...(tip ? { tip } : {}),
    ...(yon ? { yon } : {}),
    ...(durum ? { durum } : {}),
    ...(q
      ? {
          OR: [
            { belgeNo: { contains: q, mode: "insensitive" } },
            { bankaAdi: { contains: q, mode: "insensitive" } },
            { keside: { contains: q, mode: "insensitive" } },
            { aciklama: { contains: q, mode: "insensitive" } },
            {
              cari: {
                unvan: { contains: q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [items, cariler, istatistikler] = await Promise.all([
    db.cekSenet.findMany({
      where,
      orderBy: { vadeTarihi: "asc" },
      include: { cari: { select: { id: true, kod: true, unvan: true } } },
    }),
    db.cari.findMany({
      where: { organizationId: orgId, aktif: true },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
    computeStats(orgId),
  ]);

  const serialized: CekSenetRow[] = items.map((c) => ({
    id: c.id,
    cariId: c.cariId,
    tip: c.tip,
    yon: c.yon,
    durum: c.durum,
    belgeNo: c.belgeNo,
    bankaAdi: c.bankaAdi,
    sube: c.sube,
    hesapNo: c.hesapNo,
    keside: c.keside,
    tutar: c.tutar.toString(),
    paraBirimi: c.paraBirimi,
    kesideTarihi: c.kesideTarihi.toISOString(),
    vadeTarihi: c.vadeTarihi.toISOString(),
    tahsilTarihi: c.tahsilTarihi?.toISOString() ?? null,
    aciklama: c.aciklama,
    cari: c.cari,
  }));

  const cariRefs: CariRef[] = cariler;

  return (
    <CekSenetList
      items={serialized}
      cariler={cariRefs}
      istatistikler={istatistikler}
      autoOpenYeni={autoOpenYeni}
    />
  );
}

async function computeStats(orgId: string) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const acikDurumlar = [
    CekSenetDurum.Portfoyde,
    CekSenetDurum.TahsileGonderildi,
  ];

  // Bu ay sonu
  const ayBaslangic = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const ayBitis = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0);
  ayBitis.setHours(23, 59, 59, 999);

  const [alacakAgg, borcAgg, buAyVadeli, karsiliksiz] = await Promise.all([
    db.cekSenet.aggregate({
      where: {
        organizationId: orgId,
        yon: CekSenetYon.Alinan,
        durum: { in: acikDurumlar },
      },
      _sum: { tutar: true },
    }),
    db.cekSenet.aggregate({
      where: {
        organizationId: orgId,
        yon: CekSenetYon.Verilen,
        durum: { in: acikDurumlar },
      },
      _sum: { tutar: true },
    }),
    db.cekSenet.count({
      where: {
        organizationId: orgId,
        durum: { in: acikDurumlar },
        vadeTarihi: { gte: ayBaslangic, lte: ayBitis },
      },
    }),
    db.cekSenet.count({
      where: {
        organizationId: orgId,
        durum: CekSenetDurum.Karsiliksiz,
      },
    }),
  ]);

  return {
    bekleyenAlacak: Number(alacakAgg._sum.tutar ?? 0).toString(),
    bekleyenBorc: Number(borcAgg._sum.tutar ?? 0).toString(),
    buAyVadeli,
    karsiliksiz,
  };
}
