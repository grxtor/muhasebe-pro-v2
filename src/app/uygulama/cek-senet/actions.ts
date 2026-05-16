"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import {
  cekSenetSchema,
  cekSenetDurumGuncelleSchema,
} from "@/lib/schemas/cek-senet";
import {
  CekSenetDurum,
  CekSenetTip,
  CekSenetYon,
  cekSenetDurumEtiket,
  cekSenetTipEtiket,
} from "@/lib/enums";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type BulkActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  return o;
}

function ozet(tip: string, yon: string, belgeNo: string): string {
  const tipLabel = cekSenetTipEtiket[tip as keyof typeof cekSenetTipEtiket] ?? tip;
  const yonLabel = yon === CekSenetYon.Alinan ? "Alınan" : "Verilen";
  return `${yonLabel} ${tipLabel} ${belgeNo}`;
}

export async function createCekSenet(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = cekSenetSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  if (data.cariId != null) {
    const cari = await db.cari.findFirst({
      where: { id: data.cariId, organizationId: ctx.orgId },
      select: { id: true },
    });
    if (!cari) return { ok: false, error: "Profil bulunamadı" };
  }

  if (data.vadeTarihi.getTime() < data.kesideTarihi.getTime()) {
    return {
      ok: false,
      error: "Vade tarihi keşide tarihinden önce olamaz",
    };
  }

  // Tahsil durumunda otomatik tahsil tarihi
  const tahsilTarihi =
    data.durum === CekSenetDurum.Tahsil && !data.tahsilTarihi
      ? new Date()
      : data.tahsilTarihi;

  const created = await db.cekSenet.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: data.cariId,
      tip: data.tip,
      yon: data.yon,
      durum: data.durum,
      belgeNo: data.belgeNo,
      bankaAdi: data.bankaAdi,
      sube: data.sube,
      hesapNo: data.hesapNo,
      keside: data.keside,
      tutar: data.tutar,
      paraBirimi: data.paraBirimi,
      kesideTarihi: data.kesideTarihi,
      vadeTarihi: data.vadeTarihi,
      tahsilTarihi,
      aciklama: data.aciklama,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "CekSenet",
    entityId: created.id,
    ozet: `${ozet(data.tip, data.yon, data.belgeNo)} eklendi`,
  });

  revalidatePath("/uygulama/cek-senet");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: created.id } };
}

export async function updateCekSenet(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = cekSenetSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const existing = await db.cekSenet.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, belgeNo: true, durum: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  if (data.cariId != null) {
    const cari = await db.cari.findFirst({
      where: { id: data.cariId, organizationId: ctx.orgId },
      select: { id: true },
    });
    if (!cari) return { ok: false, error: "Profil bulunamadı" };
  }

  if (data.vadeTarihi.getTime() < data.kesideTarihi.getTime()) {
    return {
      ok: false,
      error: "Vade tarihi keşide tarihinden önce olamaz",
    };
  }

  // Durum Tahsil'e geçti ve tahsil tarihi yoksa bugünü kullan
  const tahsilTarihi =
    data.durum === CekSenetDurum.Tahsil && !data.tahsilTarihi
      ? new Date()
      : data.tahsilTarihi;

  await db.cekSenet.update({
    where: { id },
    data: {
      cariId: data.cariId,
      tip: data.tip,
      yon: data.yon,
      durum: data.durum,
      belgeNo: data.belgeNo,
      bankaAdi: data.bankaAdi,
      sube: data.sube,
      hesapNo: data.hesapNo,
      keside: data.keside,
      tutar: data.tutar,
      paraBirimi: data.paraBirimi,
      kesideTarihi: data.kesideTarihi,
      vadeTarihi: data.vadeTarihi,
      tahsilTarihi,
      aciklama: data.aciklama,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "CekSenet",
    entityId: id,
    ozet: `${ozet(data.tip, data.yon, data.belgeNo)} güncellendi`,
  });

  revalidatePath("/uygulama/cek-senet");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteCekSenet(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.cekSenet.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, belgeNo: true, tip: true, yon: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.cekSenet.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "CekSenet",
    entityId: id,
    ozet: `${ozet(existing.tip, existing.yon, existing.belgeNo)} silindi`,
  });

  revalidatePath("/uygulama/cek-senet");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateCekSenetDurum(
  id: number,
  durum: string,
  tahsilTarihi?: Date | string | null,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = cekSenetDurumGuncelleSchema.safeParse({
    durum,
    tahsilTarihi: tahsilTarihi ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cekSenet.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: {
      id: true,
      belgeNo: true,
      tip: true,
      yon: true,
      durum: true,
      tahsilTarihi: true,
    },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  // Tahsil durumu için tarih ayarla (yoksa bugünü kullan)
  let yeniTahsilTarihi: Date | null = existing.tahsilTarihi;
  if (parsed.data.durum === CekSenetDurum.Tahsil) {
    yeniTahsilTarihi = parsed.data.tahsilTarihi ?? new Date();
  } else if (existing.durum === CekSenetDurum.Tahsil) {
    // Tahsil'den başka bir duruma geçiyorsa tahsil tarihini temizle
    yeniTahsilTarihi = null;
  }

  await db.cekSenet.update({
    where: { id },
    data: {
      durum: parsed.data.durum,
      tahsilTarihi: yeniTahsilTarihi,
    },
  });

  const durumLabel =
    cekSenetDurumEtiket[
      parsed.data.durum as keyof typeof cekSenetDurumEtiket
    ] ?? parsed.data.durum;

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "CekSenet",
    entityId: id,
    ozet: `${ozet(existing.tip, existing.yon, existing.belgeNo)} → ${durumLabel}`,
  });

  revalidatePath("/uygulama/cek-senet");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function bulkDeleteCekSenet(
  ids: number[],
): Promise<BulkActionResult> {
  const ctx = await getOrgContext();
  if (ids.length === 0) return { ok: true, count: 0 };

  const result = await db.cekSenet.deleteMany({
    where: { id: { in: ids }, organizationId: ctx.orgId },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "CekSenet",
    ozet: `${result.count} çek/senet toplu silindi`,
  });

  revalidatePath("/uygulama/cek-senet");
  revalidatePath("/uygulama");
  return { ok: true, count: result.count };
}

// Not: isCekSenetTip / isCekSenetYon / isCekSenetDurum sync type guard'ları
// "use server" dosyasında bulunamaz. @/lib/schemas/cek-senet'te bulunabilirler.
