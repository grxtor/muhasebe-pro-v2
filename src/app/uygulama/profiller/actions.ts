"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { profilSchema } from "@/lib/schemas/profil";
import { CariTipi, cariTipiEtiket, HarcamaTuru } from "@/lib/enums";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function nextProfilKodu(): Promise<string> {
  const { orgId } = await getOrgContext();
  const count = await db.cari.count({ where: { organizationId: orgId } });
  return `CR-${String(count + 1).padStart(3, "0")}`;
}

/**
 * Hızlı profil oluşturma — sadece isim + tip + harcamaTürü ile minimum cari.
 * Combobox'lardan "yeni" geldiğinde kullanılır: kod otomatik, diğer alanlar boş.
 */
export async function createCariInline(input: {
  unvan: string;
  tip: CariTipi;
  harcamaTuru?: HarcamaTuru;
}): Promise<ActionResult<{ id: number; unvan: string; kod: string }>> {
  const ctx = await getOrgContext();
  const unvan = input.unvan.trim();
  if (unvan.length < 2) {
    return { ok: false, error: "İsim en az 2 karakter olmalı" };
  }
  if (unvan.length > 250) {
    return { ok: false, error: "İsim çok uzun" };
  }

  const count = await db.cari.count({ where: { organizationId: ctx.orgId } });
  const kod = `CR-${String(count + 1).padStart(3, "0")}`;

  const harcamaTuru =
    input.tip === CariTipi.Harcama
      ? (input.harcamaTuru ?? HarcamaTuru.Genel)
      : null;

  const created = await db.cari.create({
    data: {
      kod,
      unvan,
      tip: input.tip,
      harcamaTuru,
      aktif: true,
      userId: ctx.userId,
      organizationId: ctx.orgId,
    },
    select: { id: true, kod: true, unvan: true },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Cari",
    entityId: String(created.id),
    ozet: `Inline profil eklendi: ${created.unvan}${harcamaTuru ? ` (${harcamaTuru})` : ""}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama/muzik-odemeleri");
  return { ok: true, data: created };
}

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("aktif" in o)) o.aktif = false;
  return o;
}

export async function createProfil(formData: FormData): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { organizationId: ctx.orgId, kod: parsed.data.kod },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Bu kod (${parsed.data.kod}) zaten kayıtlı` };
  }

  const harcamaTuru =
    parsed.data.tip === CariTipi.Harcama
      ? (parsed.data.harcamaTuru ?? HarcamaTuru.Genel)
      : null;

  // Promoter metadata yalnız harcamaTuru=Promoter ise tutulur
  const promoterPayload =
    harcamaTuru === HarcamaTuru.Promoter
      ? {
          promoterNiche: parsed.data.promoterNiche,
          promoterTier: parsed.data.promoterTier,
          promoterFollowers: parsed.data.promoterFollowers,
          promoterAvgViews: parsed.data.promoterAvgViews,
          promoterPricePerVideo: parsed.data.promoterPricePerVideo,
          promoterHasInstagram: parsed.data.promoterHasInstagram,
          promoterHasTikTok: parsed.data.promoterHasTikTok,
        }
      : {
          promoterNiche: null,
          promoterTier: null,
          promoterFollowers: null,
          promoterAvgViews: null,
          promoterPricePerVideo: null,
          promoterHasInstagram: null,
          promoterHasTikTok: null,
        };

  await db.cari.create({
    data: {
      ...parsed.data,
      harcamaTuru,
      ...promoterPayload,
      userId: ctx.userId,
      organizationId: ctx.orgId,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Cari",
    ozet: `Profil eklendi: ${parsed.data.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateProfil(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Kayıt bulunamadı" };
  }

  const dupe = await db.cari.findFirst({
    where: {
      organizationId: ctx.orgId,
      kod: parsed.data.kod,
      NOT: { id },
    },
    select: { id: true },
  });
  if (dupe) {
    return {
      ok: false,
      error: `Bu kod (${parsed.data.kod}) başka bir profilde kayıtlı`,
    };
  }

  const harcamaTuru =
    parsed.data.tip === CariTipi.Harcama
      ? (parsed.data.harcamaTuru ?? HarcamaTuru.Genel)
      : null;

  const promoterPayload =
    harcamaTuru === HarcamaTuru.Promoter
      ? {
          promoterNiche: parsed.data.promoterNiche,
          promoterTier: parsed.data.promoterTier,
          promoterFollowers: parsed.data.promoterFollowers,
          promoterAvgViews: parsed.data.promoterAvgViews,
          promoterPricePerVideo: parsed.data.promoterPricePerVideo,
          promoterHasInstagram: parsed.data.promoterHasInstagram,
          promoterHasTikTok: parsed.data.promoterHasTikTok,
        }
      : {
          promoterNiche: null,
          promoterTier: null,
          promoterFollowers: null,
          promoterAvgViews: null,
          promoterPricePerVideo: null,
          promoterHasInstagram: null,
          promoterHasTikTok: null,
        };

  await db.cari.update({
    where: { id },
    data: { ...parsed.data, harcamaTuru, ...promoterPayload },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "Cari",
    entityId: id,
    ozet: `Profil güncellendi: ${parsed.data.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteProfil(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.cari.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: {
      id: true,
      unvan: true,
      _count: { select: { faturalar: true } },
    },
  });
  if (!existing) {
    return { ok: false, error: "Kayıt bulunamadı" };
  }
  if (existing._count.faturalar > 0) {
    return {
      ok: false,
      error: `Bu profile bağlı ${existing._count.faturalar} fatura var. Önce faturaları silin.`,
    };
  }
  await db.cari.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Cari",
    entityId: id,
    ozet: `Profil silindi: ${existing.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function toggleProfilAktif(
  id: number,
  aktif: boolean,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  await db.cari.updateMany({
    where: { id, organizationId: ctx.orgId },
    data: { aktif },
  });
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}

/* ============================================================
   Excel / CSV — Export / Import
   ============================================================ */

/**
 * Excel/CSV içine yazılan tek bir profil satırı.
 * Anahtarlar Türkçe — kullanıcı tarafından kolay düzenlenebilsin.
 */
export interface ProfilExportRow {
  Kod: string;
  Unvan: string;
  Tip: string;
  VergiNo: string;
  VergiDairesi: string;
  TcKimlikNo: string;
  Telefon: string;
  Email: string;
  Adres: string;
  Sehir: string;
  AcilisBakiyesi: number;
  Notlar: string;
  Aktif: string;
}

/** Tüm profilleri dışa aktarmak üzere bir liste döner. */
export async function exportProfiller(): Promise<{ rows: ProfilExportRow[] }> {
  const ctx = await getOrgContext();
  const records = await db.cari.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: { unvan: "asc" },
  });

  const rows: ProfilExportRow[] = records.map((c) => ({
    Kod: c.kod,
    Unvan: c.unvan,
    Tip:
      cariTipiEtiket[c.tip as keyof typeof cariTipiEtiket] ?? String(c.tip),
    VergiNo: c.vergiNo ?? "",
    VergiDairesi: c.vergiDairesi ?? "",
    TcKimlikNo: c.tcKimlikNo ?? "",
    Telefon: c.telefon ?? "",
    Email: c.email ?? "",
    Adres: c.adres ?? "",
    Sehir: c.sehir ?? "",
    AcilisBakiyesi: Number(c.acilisBakiyesi),
    Notlar: c.notlar ?? "",
    Aktif: c.aktif ? "Evet" : "Hayır",
  }));

  return { rows };
}

export interface ImportProfilRow {
  Kod?: string | number | null;
  Unvan?: string | null;
  Tip?: string | null;
  VergiNo?: string | number | null;
  VergiDairesi?: string | null;
  TcKimlikNo?: string | number | null;
  Telefon?: string | number | null;
  Email?: string | null;
  Adres?: string | null;
  Sehir?: string | null;
  AcilisBakiyesi?: number | string | null;
  Notlar?: string | null;
  Aktif?: string | boolean | null;
}

export interface ImportResult {
  ok: boolean;
  added: number;
  updated: number;
  failed: number;
  errors: string[];
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function asOptionalText(v: unknown): string | null {
  const t = asText(v);
  return t === "" ? null : t;
}

function parseTip(v: unknown): CariTipi {
  const t = asText(v).toLocaleLowerCase("tr-TR");
  if (!t) return CariTipi.Musteri;
  // Türkçe etiket ile gelmiş olabilir
  if (t.includes("müşteri") && t.includes("tedarik")) return CariTipi.HerIkisi;
  if (t.includes("müşteri") || t === "musteri") return CariTipi.Musteri;
  if (t.includes("tedarik")) return CariTipi.Tedarikci;
  if (t.includes("herikisi") || t.includes("her ikisi"))
    return CariTipi.HerIkisi;
  if (t.includes("harcama")) return CariTipi.Harcama;
  // Enum değeri ile gelmiş olabilir
  const valid = [
    CariTipi.Musteri,
    CariTipi.Tedarikci,
    CariTipi.HerIkisi,
    CariTipi.Harcama,
  ] as const;
  const match = valid.find((x) => x.toLocaleLowerCase("tr-TR") === t);
  return match ?? CariTipi.Musteri;
}

function parseAktif(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const t = asText(v).toLocaleLowerCase("tr-TR");
  if (t === "" || t === "evet" || t === "true" || t === "1" || t === "aktif") {
    return true;
  }
  return false;
}

function parseDecimal(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = asText(v).replace(/\s/g, "").replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Profilleri toplu içe aktar.
 * Mevcut profil `Kod` ile bulunur — varsa güncellenir, yoksa eklenir.
 */
export async function importProfiller(
  rows: ImportProfilRow[],
): Promise<ImportResult> {
  const ctx = await getOrgContext();

  let added = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const satirNo = index + 2; // başlık satırı + 0-index
    const data = {
      kod: asText(row.Kod),
      unvan: asText(row.Unvan),
      tip: parseTip(row.Tip),
      vergiNo: asOptionalText(row.VergiNo),
      vergiDairesi: asOptionalText(row.VergiDairesi),
      tcKimlikNo: asOptionalText(row.TcKimlikNo),
      telefon: asOptionalText(row.Telefon),
      email: asOptionalText(row.Email),
      adres: asOptionalText(row.Adres),
      sehir: asOptionalText(row.Sehir),
      acilisBakiyesi: parseDecimal(row.AcilisBakiyesi),
      notlar: asOptionalText(row.Notlar),
      aktif: parseAktif(row.Aktif),
    };

    // Zorunlu alan kontrolü
    if (!data.kod || !data.unvan || data.unvan.length < 2) {
      failed++;
      errors.push(`Satır ${satirNo}: Kod ve Ünvan (en az 2 karakter) zorunludur`);
      continue;
    }

    // Schema doğrulaması
    const parsed = profilSchema.safeParse(data);
    if (!parsed.success) {
      failed++;
      errors.push(
        `Satır ${satirNo}: ${parsed.error.issues[0]?.message ?? "Geçersiz"}`,
      );
      continue;
    }

    try {
      const existing = await db.cari.findFirst({
        where: { organizationId: ctx.orgId, kod: parsed.data.kod },
        select: { id: true },
      });

      if (existing) {
        await db.cari.update({
          where: { id: existing.id },
          data: parsed.data,
        });
        updated++;
      } else {
        await db.cari.create({
          data: {
            ...parsed.data,
            userId: ctx.userId,
            organizationId: ctx.orgId,
          },
        });
        added++;
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Veritabanı hatası";
      errors.push(`Satır ${satirNo}: ${message}`);
    }
  }

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "import",
    entity: "Cari",
    ozet: `Excel içe aktarım — ${added} eklendi, ${updated} güncellendi, ${failed} hatalı`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");

  return {
    ok: failed === 0,
    added,
    updated,
    failed,
    errors: errors.slice(0, 10), // ilk 10 hatayı döndür
  };
}
