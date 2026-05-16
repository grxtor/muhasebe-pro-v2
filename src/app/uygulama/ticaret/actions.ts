"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { OdemeYonu, OdemeDurumu } from "@/lib/enums";
import { parseTicaretDetay } from "../_lib/harcama-detay";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

interface CreateTicaretInput {
  cariId: number;
  baslik: string;
  aciklama?: string;
  yatirim: number;
  getiri: number;
  vadeTarihi: string; // ISO yyyy-mm-dd
  paraBirimi?: string;
}

export async function createTicaretKayit(
  input: CreateTicaretInput,
): Promise<ActionResult<{ id: number }>> {
  const ctx = await getOrgContext();
  if (!input.cariId || !Number.isFinite(input.cariId)) {
    return { ok: false, error: "Profil seçilmedi" };
  }
  if (!input.baslik || input.baslik.trim().length < 2) {
    return { ok: false, error: "Başlık en az 2 karakter olmalı" };
  }
  if (!(input.yatirim > 0)) {
    return { ok: false, error: "Yatırım tutarı 0'dan büyük olmalı" };
  }
  if (input.getiri < 0) {
    return { ok: false, error: "Getiri 0'dan küçük olamaz" };
  }

  const cari = await db.cari.findFirst({
    where: {
      id: input.cariId,
      organizationId: ctx.orgId,
      tip: "Harcama",
      harcamaTuru: "Ticaret",
    },
    select: { id: true, unvan: true },
  });
  if (!cari) return { ok: false, error: "Ticaret profili bulunamadı" };

  const created = await db.odemeNotu.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: input.cariId,
      yon: OdemeYonu.Borc,
      baslik: input.baslik.trim(),
      aciklama: input.aciklama?.trim() || null,
      tutar: input.yatirim,
      odenenTutar: input.yatirim,
      paraBirimi: input.paraBirimi ?? "TRY",
      vadeTarihi: new Date(input.vadeTarihi),
      durum: OdemeDurumu.Odendi,
      odemeTarihi: new Date(),
      detay: { getiri: input.getiri },
    },
    select: { id: true },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "OdemeNotu",
    entityId: created.id,
    ozet: `Ticaret kaydı eklendi: ${input.baslik} (yatırım ${input.yatirim}, getiri ${input.getiri})`,
  });

  revalidatePath("/uygulama/ticaret");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: created.id } };
}

export async function updateTicaretGetiri(
  odemeNotuId: number,
  getiri: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  if (!Number.isFinite(getiri) || getiri < 0) {
    return { ok: false, error: "Getiri 0'dan küçük olamaz" };
  }
  const existing = await db.odemeNotu.findFirst({
    where: {
      id: odemeNotuId,
      organizationId: ctx.orgId,
      cari: { tip: "Harcama", harcamaTuru: "Ticaret" },
    },
    select: { id: true, baslik: true, detay: true },
  });
  if (!existing) return { ok: false, error: "Ticaret kaydı bulunamadı" };

  const mevcut = parseTicaretDetay(existing.detay);
  await db.odemeNotu.update({
    where: { id: odemeNotuId },
    data: { detay: { ...mevcut, getiri } },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "OdemeNotu",
    entityId: odemeNotuId,
    ozet: `Ticaret getirisi güncellendi: ${existing.baslik} → ${getiri}`,
  });

  revalidatePath("/uygulama/ticaret");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteTicaretKayit(
  id: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.odemeNotu.findFirst({
    where: {
      id,
      organizationId: ctx.orgId,
      cari: { tip: "Harcama", harcamaTuru: "Ticaret" },
    },
    select: { id: true, baslik: true },
  });
  if (!existing) return { ok: false, error: "Ticaret kaydı bulunamadı" };

  await db.odemeNotu.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "OdemeNotu",
    entityId: id,
    ozet: `Ticaret kaydı silindi: ${existing.baslik}`,
  });

  revalidatePath("/uygulama/ticaret");
  revalidatePath("/uygulama");
  return { ok: true };
}
