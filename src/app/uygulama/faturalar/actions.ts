"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { faturaSchema } from "@/lib/schemas/fatura";
import {
  FaturaYonu,
  OdemeDurumu,
  OdemeYonu,
  faturaYonuEtiket,
  faturaDurumuEtiket,
} from "@/lib/enums";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("odemeNotuOlustur" in o)) o.odemeNotuOlustur = false;
  return o;
}

function hesapla(tutar: number, oran: number) {
  const kdvTutari = +(tutar * (oran / 100)).toFixed(2);
  const toplamTutar = +(tutar + kdvTutari).toFixed(2);
  return { kdvTutari, toplamTutar };
}

export async function nextFaturaNo(): Promise<string> {
  const { orgId } = await getOrgContext();
  const yil = new Date().getFullYear();
  const count = await db.fatura.count({ where: { organizationId: orgId } });
  return `${yil}-${String(count + 1).padStart(4, "0")}`;
}

export async function createFatura(formData: FormData): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = faturaSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const cari = await db.cari.findFirst({
    where: { id: data.cariId, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  const dupe = await db.fatura.findFirst({
    where: { organizationId: ctx.orgId, faturaNo: data.faturaNo },
    select: { id: true },
  });
  if (dupe) {
    return { ok: false, error: `${data.faturaNo} numaralı fatura zaten var` };
  }

  const { kdvTutari, toplamTutar } = hesapla(data.tutar, data.kdvOrani);
  const vadeTarihi =
    data.vadeTarihi ?? new Date(data.tarih.getTime() + 30 * 86_400_000);

  const result = await db.$transaction(async (tx) => {
    const fatura = await tx.fatura.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        cariId: data.cariId,
        yon: data.yon,
        faturaNo: data.faturaNo,
        tarih: data.tarih,
        vadeTarihi,
        isAciklamasi: data.isAciklamasi,
        tutar: data.tutar,
        kdvOrani: data.kdvOrani,
        kdvTutari,
        toplamTutar,
        paraBirimi: data.paraBirimi,
        durum: data.durum,
        notlar: data.notlar,
      },
    });

    if (data.odemeNotuOlustur) {
      await tx.odemeNotu.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          cariId: data.cariId,
          yon:
            data.yon === FaturaYonu.Gonderilen
              ? OdemeYonu.Alacak
              : OdemeYonu.Borc,
          baslik: `Fatura ${data.faturaNo}`,
          aciklama: data.isAciklamasi,
          tutar: toplamTutar,
          paraBirimi: data.paraBirimi,
          vadeTarihi,
          durum: OdemeDurumu.Beklemede,
          faturaId: fatura.id,
        },
      });
    }

    return fatura;
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Fatura",
    entityId: result.id,
    ozet: `Fatura oluşturuldu: ${data.faturaNo}`,
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: result.id } };
}

export async function updateFatura(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = faturaSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const existing = await db.fatura.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  const dupe = await db.fatura.findFirst({
    where: {
      organizationId: ctx.orgId,
      faturaNo: data.faturaNo,
      NOT: { id },
    },
    select: { id: true },
  });
  if (dupe) {
    return { ok: false, error: `${data.faturaNo} numaralı fatura zaten var` };
  }

  const { kdvTutari, toplamTutar } = hesapla(data.tutar, data.kdvOrani);

  await db.fatura.update({
    where: { id },
    data: {
      cariId: data.cariId,
      yon: data.yon,
      faturaNo: data.faturaNo,
      tarih: data.tarih,
      vadeTarihi: data.vadeTarihi,
      isAciklamasi: data.isAciklamasi,
      tutar: data.tutar,
      kdvOrani: data.kdvOrani,
      kdvTutari,
      toplamTutar,
      paraBirimi: data.paraBirimi,
      durum: data.durum,
      notlar: data.notlar,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "Fatura",
    entityId: id,
    ozet: `Fatura güncellendi: ${data.faturaNo}`,
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteFatura(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.fatura.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, faturaNo: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };
  await db.fatura.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Fatura",
    entityId: id,
    ozet: `Fatura silindi: ${existing.faturaNo}`,
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}

/* ============================================================
   PDF için veri yükleyici — client tarafta jsPDF üretir.
   ============================================================ */

export interface FaturaPdfPayload {
  fatura: {
    faturaNo: string;
    tarih: string;
    vadeTarihi: string | null;
    isAciklamasi: string;
    tutar: string;
    kdvOrani: string;
    kdvTutari: string;
    toplamTutar: string;
    paraBirimi: string;
    notlar: string | null;
    yon: string;
  };
  cari: {
    unvan: string;
    vergiNo: string | null;
    vergiDairesi: string | null;
    adres: string | null;
    sehir: string | null;
    telefon: string | null;
    email: string | null;
  };
  org: {
    sirketAdi: string | null;
    vergiNo: string | null;
    vergiDairesi: string | null;
    adres: string | null;
    sehir: string | null;
    ulke: string | null;
    telefon: string | null;
    email: string | null;
    website: string | null;
    iban: string | null;
    bankaAdi: string | null;
    logoUrl: string | null;
  };
}

export async function getFaturaForPdf(
  faturaId: number,
): Promise<ActionResult<FaturaPdfPayload>> {
  const ctx = await getOrgContext();

  const fatura = await db.fatura.findFirst({
    where: { id: faturaId, organizationId: ctx.orgId },
    include: {
      cari: {
        select: {
          unvan: true,
          vergiNo: true,
          vergiDairesi: true,
          adres: true,
          sehir: true,
          telefon: true,
          email: true,
        },
      },
    },
  });
  if (!fatura) return { ok: false, error: "Fatura bulunamadı" };

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      sirketAdi: true,
      ad: true,
      vergiNo: true,
      vergiDairesi: true,
      adres: true,
      sehir: true,
      ulke: true,
      telefon: true,
      email: true,
      website: true,
      iban: true,
      bankaAdi: true,
      logoUrl: true,
    },
  });
  if (!org) return { ok: false, error: "Şirket bulunamadı" };

  return {
    ok: true,
    data: {
      fatura: {
        faturaNo: fatura.faturaNo,
        tarih: fatura.tarih.toISOString(),
        vadeTarihi: fatura.vadeTarihi?.toISOString() ?? null,
        isAciklamasi: fatura.isAciklamasi,
        tutar: fatura.tutar.toString(),
        kdvOrani: fatura.kdvOrani.toString(),
        kdvTutari: fatura.kdvTutari.toString(),
        toplamTutar: fatura.toplamTutar.toString(),
        paraBirimi: fatura.paraBirimi,
        notlar: fatura.notlar,
        yon: fatura.yon,
      },
      cari: fatura.cari,
      org: {
        // sirketAdi yoksa org'un asıl adını fallback olarak kullan
        sirketAdi: org.sirketAdi ?? org.ad,
        vergiNo: org.vergiNo,
        vergiDairesi: org.vergiDairesi,
        adres: org.adres,
        sehir: org.sehir,
        ulke: org.ulke,
        telefon: org.telefon,
        email: org.email,
        website: org.website,
        iban: org.iban,
        bankaAdi: org.bankaAdi,
        logoUrl: org.logoUrl,
      },
    },
  };
}

/* ============================================================
   Excel / CSV — Export
   ============================================================ */

export interface FaturaExportRow {
  FaturaNo: string;
  Tarih: string;
  VadeTarihi: string;
  Yon: string;
  Durum: string;
  ProfilKodu: string;
  ProfilUnvani: string;
  IsAciklamasi: string;
  AraToplam: number;
  KdvOrani: number;
  KdvTutari: number;
  GenelToplam: number;
  OdenenTutar: number;
  ParaBirimi: string;
  Notlar: string;
}

export interface FaturaExportFilters {
  yon?: string;
  durum?: string;
  baslangic?: string; // ISO tarih
  bitis?: string; // ISO tarih
}

/** Faturaları (opsiyonel filtreyle) dışa aktar. */
export async function exportFaturalar(
  filters?: FaturaExportFilters,
): Promise<{ rows: FaturaExportRow[] }> {
  const ctx = await getOrgContext();

  const where: {
    organizationId: string;
    yon?: typeof FaturaYonu.Gonderilen | typeof FaturaYonu.Gelen;
    durum?: string;
    tarih?: { gte?: Date; lte?: Date };
  } = { organizationId: ctx.orgId };

  if (filters?.yon === FaturaYonu.Gonderilen || filters?.yon === FaturaYonu.Gelen) {
    where.yon = filters.yon;
  }
  if (filters?.durum) {
    where.durum = filters.durum;
  }
  if (filters?.baslangic || filters?.bitis) {
    where.tarih = {};
    if (filters.baslangic) where.tarih.gte = new Date(filters.baslangic);
    if (filters.bitis) where.tarih.lte = new Date(filters.bitis);
  }

  const records = await db.fatura.findMany({
    where: where as never,
    orderBy: { tarih: "desc" },
    include: { cari: { select: { kod: true, unvan: true } } },
  });

  const rows: FaturaExportRow[] = records.map((f) => ({
    FaturaNo: f.faturaNo,
    Tarih: f.tarih.toISOString().slice(0, 10),
    VadeTarihi: f.vadeTarihi ? f.vadeTarihi.toISOString().slice(0, 10) : "",
    Yon:
      faturaYonuEtiket[f.yon as keyof typeof faturaYonuEtiket] ?? String(f.yon),
    Durum:
      faturaDurumuEtiket[f.durum as keyof typeof faturaDurumuEtiket] ??
      String(f.durum),
    ProfilKodu: f.cari?.kod ?? "",
    ProfilUnvani: f.cari?.unvan ?? "",
    IsAciklamasi: f.isAciklamasi,
    AraToplam: Number(f.tutar),
    KdvOrani: Number(f.kdvOrani),
    KdvTutari: Number(f.kdvTutari),
    GenelToplam: Number(f.toplamTutar),
    OdenenTutar: Number(f.odenenTutar),
    ParaBirimi: f.paraBirimi,
    Notlar: f.notlar ?? "",
  }));

  return { rows };
}
