"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import {
  createFaturaFromTemplate,
  hesaplaFaturaTutarlari,
  nextFaturaNoForOrg,
} from "@/lib/finance-flow";
import {
  TekrarSiklik,
  TekrarTip,
  OdemeYonu,
  FaturaYonu,
  OdemeDurumu,
} from "@/lib/enums";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

const tekrarSchema = z.object({
  ad: z.string().min(2).max(200),
  tip: z.enum([TekrarTip.Fatura, TekrarTip.OdemeNotu]),
  cariId: z.coerce.number().int().positive(),
  yon: z.enum([OdemeYonu.Alacak, OdemeYonu.Borc]),
  tutar: z.coerce.number().positive(),
  kdvOrani: z.coerce.number().min(0).max(100).default(20),
  paraBirimi: z.string().length(3).default("TRY"),
  aciklama: z.string().max(2000).optional().or(z.literal("")),
  vadeGun: z.coerce.number().int().min(0).max(365).default(30),
  siklik: z.enum([
    TekrarSiklik.Gunluk,
    TekrarSiklik.Haftalik,
    TekrarSiklik.Aylik,
    TekrarSiklik.Uc_Aylik,
    TekrarSiklik.Alti_Aylik,
    TekrarSiklik.Yillik,
  ]),
  baslangicTarihi: z.coerce.date(),
  bitisTarihi: z
    .union([z.coerce.date(), z.literal(""), z.null(), z.undefined()])
    .transform((v) =>
      v === "" || v === null || v === undefined ? null : (v as Date),
    ),
  aktif: z.coerce.boolean().default(true),
});

function parseFD(formData: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("aktif" in o)) o.aktif = false;
  return tekrarSchema.safeParse(o);
}

function addPeriod(date: Date, siklik: string): Date {
  const d = new Date(date);
  switch (siklik) {
    case TekrarSiklik.Gunluk:
      d.setDate(d.getDate() + 1);
      break;
    case TekrarSiklik.Haftalik:
      d.setDate(d.getDate() + 7);
      break;
    case TekrarSiklik.Aylik:
      d.setMonth(d.getMonth() + 1);
      break;
    case TekrarSiklik.Uc_Aylik:
      d.setMonth(d.getMonth() + 3);
      break;
    case TekrarSiklik.Alti_Aylik:
      d.setMonth(d.getMonth() + 6);
      break;
    case TekrarSiklik.Yillik:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export async function createTekrarlayan(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = parseFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const cari = await db.cari.findFirst({
    where: { id: data.cariId, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  const t = await db.tekrarlayanKayit.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      ad: data.ad,
      tip: data.tip,
      cariId: data.cariId,
      yon: data.yon,
      tutar: data.tutar,
      kdvOrani: data.kdvOrani,
      paraBirimi: data.paraBirimi,
      aciklama: data.aciklama || null,
      vadeGun: data.vadeGun,
      siklik: data.siklik,
      baslangicTarihi: data.baslangicTarihi,
      sonrakiTarih: data.baslangicTarihi,
      bitisTarihi: data.bitisTarihi,
      aktif: data.aktif,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "TekrarlayanKayit",
    entityId: t.id,
    ozet: `Tekrarlayan kayıt eklendi: ${data.ad}`,
  });

  revalidatePath("/uygulama/tekrarlayanlar");
  return { ok: true };
}

export async function updateTekrarlayan(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = parseFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.tekrarlayanKayit.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  const cari = await db.cari.findFirst({
    where: { id: parsed.data.cariId, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  await db.tekrarlayanKayit.update({
    where: { id },
    data: {
      ad: parsed.data.ad,
      tip: parsed.data.tip,
      cariId: parsed.data.cariId,
      yon: parsed.data.yon,
      tutar: parsed.data.tutar,
      kdvOrani: parsed.data.kdvOrani,
      paraBirimi: parsed.data.paraBirimi,
      aciklama: parsed.data.aciklama || null,
      vadeGun: parsed.data.vadeGun,
      siklik: parsed.data.siklik,
      baslangicTarihi: parsed.data.baslangicTarihi,
      bitisTarihi: parsed.data.bitisTarihi,
      aktif: parsed.data.aktif,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "TekrarlayanKayit",
    entityId: id,
    ozet: `Tekrarlayan kayıt güncellendi: ${parsed.data.ad}`,
  });

  revalidatePath("/uygulama/tekrarlayanlar");
  return { ok: true };
}

export async function deleteTekrarlayan(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.tekrarlayanKayit.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { ad: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.tekrarlayanKayit.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "TekrarlayanKayit",
    entityId: id,
    ozet: `Tekrarlayan kayıt silindi: ${existing.ad}`,
  });

  revalidatePath("/uygulama/tekrarlayanlar");
  return { ok: true };
}

/**
 * Bir tekrarlayan kayıt için manuel olarak bir sonraki kaydı üretir
 * (fatura veya odeme notu olarak). Cron için ileride bir scheduler
 * eklenecek; şimdilik kullanıcı manuel tetikler.
 */
export async function generateNext(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const t = await db.tekrarlayanKayit.findFirst({
    where: { id, organizationId: ctx.orgId, aktif: true },
    include: { cari: { select: { id: true, unvan: true } } },
  });
  if (!t) return { ok: false, error: "Aktif kayıt bulunamadı" };

  if (t.bitisTarihi && t.sonrakiTarih > t.bitisTarihi) {
    return { ok: false, error: "Bitiş tarihi geçildi" };
  }

  const tarih = new Date(t.sonrakiTarih);
  const vadeTarihi = new Date(tarih.getTime() + t.vadeGun * 86_400_000);
  const { kdvTutari, toplamTutar } = hesaplaFaturaTutarlari(
    Number(t.tutar),
    Number(t.kdvOrani),
  );

  await db.$transaction(async (tx) => {
    if (t.tip === TekrarTip.Fatura) {
      const faturaNo = await nextFaturaNoForOrg(tx, ctx.orgId, tarih);
      await createFaturaFromTemplate(tx, ctx, {
        cariId: t.cariId,
        yon:
          t.yon === OdemeYonu.Alacak ? FaturaYonu.Gonderilen : FaturaYonu.Gelen,
        faturaNo,
        tarih,
        vadeTarihi,
        isAciklamasi: t.aciklama || t.ad,
        tutar: t.tutar,
        kdvOrani: t.kdvOrani,
        kdvTutari,
        toplamTutar,
        paraBirimi: t.paraBirimi,
      });
    } else {
      await tx.odemeNotu.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          cariId: t.cariId,
          yon: t.yon as never,
          baslik: t.ad,
          aciklama: t.aciklama,
          tutar: t.tutar,
          paraBirimi: t.paraBirimi,
          vadeTarihi,
          durum: OdemeDurumu.Beklemede,
        },
      });
    }

    await tx.tekrarlayanKayit.update({
      where: { id },
      data: {
        sonrakiTarih: addPeriod(t.sonrakiTarih, t.siklik),
        uretilenAdet: { increment: 1 },
        sonUretimTarihi: new Date(),
      },
    });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "TekrarlayanKayit",
    entityId: id,
    ozet: `"${t.ad}" için ${t.tip === TekrarTip.Fatura ? "fatura" : "alacak/borç"} üretildi`,
  });

  revalidatePath("/uygulama/tekrarlayanlar");
  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function toggleAktif(
  id: number,
  aktif: boolean,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  await db.tekrarlayanKayit.updateMany({
    where: { id, organizationId: ctx.orgId },
    data: { aktif },
  });
  revalidatePath("/uygulama/tekrarlayanlar");
  return { ok: true };
}
