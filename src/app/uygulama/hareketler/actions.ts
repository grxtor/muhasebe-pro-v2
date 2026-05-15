"use server";

import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { HareketTipi, hareketTipiEtiket } from "@/lib/enums";

/* ============================================================
   Excel / CSV — Export
   ============================================================ */

export interface HareketExportRow {
  Tarih: string;
  ProfilKodu: string;
  ProfilUnvani: string;
  Tip: string;
  Tutar: number;
  ParaBirimi: string;
  Aciklama: string;
  BelgeNo: string;
  VadeTarihi: string;
}

export interface HareketExportFilters {
  tip?: string;
  baslangic?: string;
  bitis?: string;
  q?: string;
}

/** Hareketleri (opsiyonel filtreyle) dışa aktar. */
export async function exportHareketler(
  filters?: HareketExportFilters,
): Promise<{ rows: HareketExportRow[] }> {
  const ctx = await getOrgContext();

  const where: {
    organizationId: string;
    tip?: typeof HareketTipi.Alacak | typeof HareketTipi.Borc;
    tarih?: { gte?: Date; lte?: Date };
    OR?: Array<Record<string, unknown>>;
  } = { organizationId: ctx.orgId };

  if (filters?.tip === HareketTipi.Alacak || filters?.tip === HareketTipi.Borc) {
    where.tip = filters.tip;
  }
  if (filters?.baslangic || filters?.bitis) {
    where.tarih = {};
    if (filters.baslangic) where.tarih.gte = new Date(filters.baslangic);
    if (filters.bitis) where.tarih.lte = new Date(filters.bitis);
  }
  if (filters?.q) {
    const q = filters.q;
    where.OR = [
      { aciklama: { contains: q, mode: "insensitive" } },
      { cari: { unvan: { contains: q, mode: "insensitive" } } },
      { belgeNo: { contains: q, mode: "insensitive" } },
    ];
  }

  const records = await db.hareket.findMany({
    where: where as never,
    orderBy: { tarih: "desc" },
    include: { cari: { select: { kod: true, unvan: true } } },
  });

  const rows: HareketExportRow[] = records.map((h) => ({
    Tarih: h.tarih.toISOString().slice(0, 10),
    ProfilKodu: h.cari?.kod ?? "",
    ProfilUnvani: h.cari?.unvan ?? "",
    Tip:
      hareketTipiEtiket[h.tip as keyof typeof hareketTipiEtiket] ??
      String(h.tip),
    Tutar: Number(h.tutar),
    ParaBirimi: h.paraBirimi,
    Aciklama: h.aciklama ?? "",
    BelgeNo: h.belgeNo ?? "",
    VadeTarihi: h.vadeTarihi ? h.vadeTarihi.toISOString().slice(0, 10) : "",
  }));

  return { rows };
}
