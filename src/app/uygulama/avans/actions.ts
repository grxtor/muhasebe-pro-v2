"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { OdemeYonu, OdemeDurumu } from "@/lib/enums";
import { parseAvansDetay } from "../_lib/harcama-detay";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

interface CreateAvansInput {
  cariId: number;
  baslik: string;
  aciklama?: string;
  tutar: number;
  geriOdemeTarihi: string; // ISO yyyy-mm-dd
  paraBirimi?: string;
}

export async function createAvansKayit(
  input: CreateAvansInput,
): Promise<ActionResult<{ id: number }>> {
  const ctx = await getOrgContext();
  if (!input.cariId || !Number.isFinite(input.cariId)) {
    return { ok: false, error: "Profil seçilmedi" };
  }
  if (!input.baslik || input.baslik.trim().length < 2) {
    return { ok: false, error: "Başlık en az 2 karakter olmalı" };
  }
  if (!(input.tutar > 0)) {
    return { ok: false, error: "Tutar 0'dan büyük olmalı" };
  }
  if (!input.geriOdemeTarihi) {
    return { ok: false, error: "Geri ödeme tarihi gerekli" };
  }

  const cari = await db.cari.findFirst({
    where: {
      id: input.cariId,
      organizationId: ctx.orgId,
      tip: "Harcama",
      harcamaTuru: "Avans",
    },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Avans profili bulunamadı" };

  const created = await db.odemeNotu.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: input.cariId,
      yon: OdemeYonu.Borc,
      baslik: input.baslik.trim(),
      aciklama: input.aciklama?.trim() || null,
      tutar: input.tutar,
      odenenTutar: input.tutar,
      paraBirimi: input.paraBirimi ?? "TRY",
      vadeTarihi: new Date(input.geriOdemeTarihi),
      durum: OdemeDurumu.Odendi,
      odemeTarihi: new Date(),
      detay: {
        geriOdemeTarihi: input.geriOdemeTarihi,
        geriOdendi: false,
      },
    },
    select: { id: true },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "OdemeNotu",
    entityId: created.id,
    ozet: `Avans verildi: ${input.baslik} (${input.tutar})`,
  });

  revalidatePath("/uygulama/avans");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: created.id } };
}

export async function markAvansOdendi(
  odemeNotuId: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();

  const tarihRaw = formData.get("tarih");
  const tutarRaw = formData.get("tutar");

  const tarih = typeof tarihRaw === "string" && tarihRaw ? tarihRaw : null;
  const tutar =
    typeof tutarRaw === "string" && tutarRaw ? Number(tutarRaw) : null;

  if (!tarih) return { ok: false, error: "Geri ödeme tarihi gerekli" };
  if (tutar === null || !Number.isFinite(tutar) || tutar <= 0) {
    return { ok: false, error: "Geri ödenen tutar 0'dan büyük olmalı" };
  }

  const existing = await db.odemeNotu.findFirst({
    where: {
      id: odemeNotuId,
      organizationId: ctx.orgId,
      cari: { tip: "Harcama", harcamaTuru: "Avans" },
    },
    select: { id: true, baslik: true, detay: true, tutar: true },
  });
  if (!existing) return { ok: false, error: "Avans kaydı bulunamadı" };

  const mevcut = parseAvansDetay(existing.detay);

  await db.odemeNotu.update({
    where: { id: odemeNotuId },
    data: {
      detay: {
        ...mevcut,
        geriOdendi: true,
        geriOdemeTarihi: tarih,
        geriOdenenTutar: tutar,
      },
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "OdemeNotu",
    entityId: odemeNotuId,
    ozet: `Avans geri ödendi: ${existing.baslik} (${tutar})`,
  });

  revalidatePath("/uygulama/avans");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteAvansKayit(
  id: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.odemeNotu.findFirst({
    where: {
      id,
      organizationId: ctx.orgId,
      cari: { tip: "Harcama", harcamaTuru: "Avans" },
    },
    select: { id: true, baslik: true },
  });
  if (!existing) return { ok: false, error: "Avans kaydı bulunamadı" };

  await db.odemeNotu.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "OdemeNotu",
    entityId: id,
    ozet: `Avans kaydı silindi: ${existing.baslik}`,
  });

  revalidatePath("/uygulama/avans");
  revalidatePath("/uygulama");
  return { ok: true };
}

