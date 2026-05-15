"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getOrgContext } from "./auth-helpers";
import { logAction } from "./audit";

export type ActionResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Toplu profil silme. faturası olanları atlar, geriye kalanlar silinir.
 */
export async function bulkDeleteProfiller(ids: number[]): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (ids.length === 0) return { ok: true, count: 0 };

  // Sadece bu org'a ait olanları al
  const eligible = await db.cari.findMany({
    where: { id: { in: ids }, organizationId: ctx.orgId },
    select: {
      id: true,
      unvan: true,
      _count: { select: { faturalar: true } },
    },
  });

  const silinebilir = eligible.filter((c) => c._count.faturalar === 0);
  if (silinebilir.length === 0) {
    return {
      ok: false,
      error: "Seçili profillerin hepsinde fatura var — silinemez",
    };
  }

  const result = await db.cari.deleteMany({
    where: { id: { in: silinebilir.map((c) => c.id) } },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Cari",
    ozet: `${result.count} profil toplu silindi`,
  });

  revalidatePath("/uygulama/profiller");
  return { ok: true, count: result.count };
}

export async function bulkDeleteFaturalar(ids: number[]): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (ids.length === 0) return { ok: true, count: 0 };

  const result = await db.fatura.deleteMany({
    where: { id: { in: ids }, organizationId: ctx.orgId },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Fatura",
    ozet: `${result.count} fatura toplu silindi`,
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  return { ok: true, count: result.count };
}

export async function bulkDeleteOdemeNotlari(
  ids: number[],
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (ids.length === 0) return { ok: true, count: 0 };

  const result = await db.odemeNotu.deleteMany({
    where: { id: { in: ids }, organizationId: ctx.orgId },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "OdemeNotu",
    ozet: `${result.count} alacak/borç toplu silindi`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  return { ok: true, count: result.count };
}

export async function bulkDeleteUrunler(ids: number[]): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (ids.length === 0) return { ok: true, count: 0 };

  const result = await db.urun.deleteMany({
    where: { id: { in: ids }, organizationId: ctx.orgId },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Urun",
    ozet: `${result.count} ürün toplu silindi`,
  });

  revalidatePath("/uygulama/urunler");
  return { ok: true, count: result.count };
}
