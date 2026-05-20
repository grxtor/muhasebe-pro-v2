"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { saveFile } from "@/lib/files";

// ----------------------------------------------------------------------------
// Tipler
// ----------------------------------------------------------------------------

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface ParsedCsv {
  rows: Array<Record<string, unknown>>;
  preview: Array<Record<string, unknown>>;
  columns: string[];
  totalRows: number;
}

export interface ColumnMapping {
  trackName: string;
  revenue: string;
  streams?: string;
}

interface RawDataPayload {
  mapping: ColumnMapping;
  rows: Array<Record<string, unknown>>;
}

// ----------------------------------------------------------------------------
// Yardımcılar
// ----------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "");
    const normalized = cleaned.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toInt(v: unknown): number {
  const n = toNumber(v);
  return Math.trunc(n);
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fuzzyScore(a: string, b: string): number {
  const x = normalizeStr(a);
  const y = normalizeStr(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  // Kelime kesişimi
  const xs = new Set(x.split(/\s+/));
  const ys = new Set(y.split(/\s+/));
  let inter = 0;
  for (const w of xs) if (ys.has(w)) inter++;
  const union = xs.size + ys.size - inter;
  return union > 0 ? inter / union : 0;
}

// ----------------------------------------------------------------------------
// parseCsv — client'tan File alır, parse edip preview döner
// ----------------------------------------------------------------------------

export async function parseCsv(formData: FormData): Promise<ActionResult<ParsedCsv>> {
  await getOrgContext(); // auth gate

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Dosya seçilmedi" };
  }

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) {
      return { ok: false, error: "Dosya boş" };
    }
    const ws = wb.Sheets[firstSheet];
    if (!ws) {
      return { ok: false, error: "Sayfa okunamadı" };
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    if (rows.length === 0) {
      return { ok: false, error: "Hiç satır bulunamadı" };
    }
    const columns = Object.keys(rows[0] ?? {});
    if (columns.length === 0) {
      return { ok: false, error: "Sütun başlığı bulunamadı" };
    }

    return {
      ok: true,
      data: {
        rows,
        preview: rows.slice(0, 10),
        columns,
        totalRows: rows.length,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return { ok: false, error: `CSV okunamadı: ${msg}` };
  }
}

// ----------------------------------------------------------------------------
// createDistributorRapor
// ----------------------------------------------------------------------------

interface CreateInput {
  ad: string;
  platform: string;
  donem: string;
  paraBirimi: string;
  mapping: ColumnMapping;
  notlar?: string;
}

function parseCreateFields(formData: FormData): CreateInput | { error: string } {
  const ad = String(formData.get("ad") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const donem = String(formData.get("donem") ?? "").trim();
  const paraBirimi = String(formData.get("paraBirimi") ?? "TRY")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const trackName = String(formData.get("mapping.trackName") ?? "").trim();
  const revenue = String(formData.get("mapping.revenue") ?? "").trim();
  const streamsRaw = String(formData.get("mapping.streams") ?? "").trim();
  const notlar = String(formData.get("notlar") ?? "").trim();

  if (!ad) return { error: "Rapor adı zorunlu" };
  if (!donem || !/^\d{4}-\d{2}$/.test(donem)) {
    return { error: "Dönem yyyy-MM formatında olmalı (örn: 2026-03)" };
  }
  if (!trackName) return { error: "Track/Video adı sütunu seçilmedi" };
  if (!revenue) return { error: "Gelir sütunu seçilmedi" };

  return {
    ad,
    platform: platform || "Diğer",
    donem,
    paraBirimi: paraBirimi || "TRY",
    mapping: {
      trackName,
      revenue,
      streams: streamsRaw || undefined,
    },
    notlar: notlar || undefined,
  };
}

export async function createDistributorRapor(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const ctx = await getOrgContext();

  const fields = parseCreateFields(formData);
  if ("error" in fields) return { ok: false, error: fields.error };

  // Dosya zorunlu
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "CSV dosyası eksik" };
  }

  // Parse et — burada da yeniden okuyup totalleri hesaplıyoruz
  let rows: Array<Record<string, unknown>>;
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) return { ok: false, error: "Dosya boş" };
    const ws = wb.Sheets[firstSheet];
    if (!ws) return { ok: false, error: "Sayfa okunamadı" };
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return { ok: false, error: `CSV okunamadı: ${msg}` };
  }

  if (rows.length === 0) {
    return { ok: false, error: "CSV satır içermiyor" };
  }

  const { mapping } = fields;

  // Sütun varlığını doğrula
  const cols = Object.keys(rows[0] ?? {});
  if (!cols.includes(mapping.trackName)) {
    return { ok: false, error: `"${mapping.trackName}" sütunu CSV'de yok` };
  }
  if (!cols.includes(mapping.revenue)) {
    return { ok: false, error: `"${mapping.revenue}" sütunu CSV'de yok` };
  }
  if (mapping.streams && !cols.includes(mapping.streams)) {
    return { ok: false, error: `"${mapping.streams}" sütunu CSV'de yok` };
  }

  // Toplamlar
  let toplamGelir = 0;
  let toplamStream = 0;
  for (const r of rows) {
    toplamGelir += toNumber(r[mapping.revenue]);
    if (mapping.streams) toplamStream += toInt(r[mapping.streams]);
  }

  // Dosyayı diskte sakla
  let saved: { relativePath: string; originalName: string } | null = null;
  try {
    saved = await saveFile(file, `distributor/${ctx.orgId}`, ctx.userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return { ok: false, error: `Dosya kaydedilemedi: ${msg}` };
  }

  const rawData: RawDataPayload = { mapping, rows };

  const created = await db.distributorRapor.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      ad: fields.ad,
      platform: fields.platform,
      donem: fields.donem,
      dosyaAdi: saved.originalName,
      depoYolu: saved.relativePath,
      toplamGelir: new Prisma.Decimal(toplamGelir.toFixed(2)),
      paraBirimi: fields.paraBirimi,
      toplamStream,
      satirSayisi: rows.length,
      notlar: fields.notlar ?? null,
      rawData: rawData as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "DistributorRapor",
    entityId: created.id,
    ozet: `Distribütör raporu yüklendi: ${fields.ad} (${rows.length} satır, ${toplamGelir.toFixed(2)} ${fields.paraBirimi})`,
  });

  revalidatePath("/uygulama/distributor");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: created.id } };
}

// ----------------------------------------------------------------------------
// deleteDistributorRapor
// ----------------------------------------------------------------------------

/**
 * Audit #14 — Distribütör raporu satırlarını MuzikGelir tablosuna yansıt.
 *
 * Algoritma:
 *  1. Rapor'un raw rows'unu oku
 *  2. Her satırın trackName'i ile org'daki MuzikProfil.isim'i (case-insensitive)
 *     eşleştir
 *  3. Eşleşme varsa MuzikGelir create (rapor donem tarihinde, paraBirimi raporun)
 *  4. Aynı rapor için tekrar tetiklenirse duplicate olmaması için not'a
 *     "DistributorRapor#X" işareti — varsa atla
 *  5. Sonuç: { eslesen, eslesmeyen, olusan }
 */
export async function syncRaporToMuzikGelir(
  raporId: number,
): Promise<ActionResult<{ eslesen: number; eslesmeyen: number; olusan: number }>> {
  const ctx = await getOrgContext();
  const rapor = await db.distributorRapor.findFirst({
    where: { id: raporId, organizationId: ctx.orgId },
    select: {
      id: true,
      ad: true,
      donem: true,
      paraBirimi: true,
      rawData: true,
    },
  });
  if (!rapor) return { ok: false, error: "Rapor bulunamadı" };

  const raw = rapor.rawData as unknown as RawDataPayload | null;
  if (!raw || !raw.mapping || !raw.rows) {
    return { ok: false, error: "Rapor satır içermiyor" };
  }
  const { mapping, rows } = raw;

  /* Tüm muzik profilleri yükle (isim → id map için) */
  const profilller = await db.muzikProfil.findMany({
    where: { organizationId: ctx.orgId, aktif: true },
    select: { id: true, isim: true },
  });
  const isimMap = new Map<string, number>(
    profilller.map((p) => [p.isim.toLowerCase().trim(), p.id]),
  );

  /* Donem'i date'e çevir — YYYY-MM gibi geliyor varsayalım */
  const donemDate = parseDonem(rapor.donem);
  const not = `DistributorRapor#${rapor.id} (${rapor.ad})`;

  let eslesen = 0;
  let eslesmeyen = 0;
  let olusan = 0;

  await db.$transaction(async (tx) => {
    for (const r of rows) {
      const trackName = String(r[mapping.trackName] ?? "").trim();
      if (!trackName) {
        eslesmeyen++;
        continue;
      }
      const muzikId = isimMap.get(trackName.toLowerCase());
      if (!muzikId) {
        eslesmeyen++;
        continue;
      }
      eslesen++;

      /* Duplicate check — bu rapor için aynı müziğe daha önce yansıdı mı? */
      const existing = await tx.muzikGelir.findFirst({
        where: {
          muzikProfilId: muzikId,
          organizationId: ctx.orgId,
          not: { contains: `DistributorRapor#${rapor.id}` },
        },
        select: { id: true },
      });
      if (existing) continue;

      const tutar = toNumber(r[mapping.revenue]);
      if (tutar <= 0) continue;

      await tx.muzikGelir.create({
        data: {
          muzikProfilId: muzikId,
          tarih: donemDate,
          platform: null, // Distribütör multi-platform; rapor seviyesinde ayrı
          tutar: new Prisma.Decimal(tutar.toFixed(2)) as unknown as number,
          paraBirimi: rapor.paraBirimi,
          not,
          organizationId: ctx.orgId,
          userId: ctx.userId,
        },
      });
      olusan++;
    }
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "MuzikGelir",
    entityId: String(rapor.id),
    ozet: `Distribütör → Müzik geliri sync: ${olusan} oluştu (${eslesen} eşleşti, ${eslesmeyen} atlandı)`,
  });

  revalidatePath("/uygulama/muzik-odemeleri");
  revalidatePath(`/uygulama/distributor/${raporId}`);
  return { ok: true, data: { eslesen, eslesmeyen, olusan } };
}

/** Donem string ('2026-05' veya '2026-05-15') → Date. */
function parseDonem(s: string): Date {
  if (/^\d{4}-\d{2}$/.test(s)) {
    return new Date(`${s}-01`);
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

export async function deleteDistributorRapor(
  id: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.distributorRapor.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, ad: true },
  });
  if (!existing) return { ok: false, error: "Rapor bulunamadı" };

  // OdemeNotu bağlantıları onDelete: SetNull olduğu için otomatik kopar
  await db.distributorRapor.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "DistributorRapor",
    entityId: id,
    ozet: `Distribütör raporu silindi: ${existing.ad}`,
  });

  revalidatePath("/uygulama/distributor");
  revalidatePath("/uygulama");
  return { ok: true };
}

// ----------------------------------------------------------------------------
// linkPromosyonKayit — Promosyon OdemeNotu'sunu rapora bağla
// ----------------------------------------------------------------------------

export async function linkPromosyonKayit(
  raporId: number,
  odemeNotuId: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const rapor = await db.distributorRapor.findFirst({
    where: { id: raporId, organizationId: ctx.orgId },
    select: { id: true, ad: true },
  });
  if (!rapor) return { ok: false, error: "Rapor bulunamadı" };

  const notu = await db.odemeNotu.findFirst({
    where: { id: odemeNotuId, organizationId: ctx.orgId },
    select: { id: true, baslik: true },
  });
  if (!notu) return { ok: false, error: "Kayıt bulunamadı" };

  await db.odemeNotu.update({
    where: { id: odemeNotuId },
    data: { distributorRaporId: raporId },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "link",
    entity: "DistributorRapor",
    entityId: raporId,
    ozet: `Promosyon "${notu.baslik}" rapora bağlandı: ${rapor.ad}`,
  });

  revalidatePath(`/uygulama/distributor/${raporId}`);
  return { ok: true };
}

export async function unlinkPromosyonKayit(
  raporId: number,
  odemeNotuId: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const notu = await db.odemeNotu.findFirst({
    where: {
      id: odemeNotuId,
      organizationId: ctx.orgId,
      distributorRaporId: raporId,
    },
    select: { id: true, baslik: true },
  });
  if (!notu) return { ok: false, error: "Bağlantı bulunamadı" };

  await db.odemeNotu.update({
    where: { id: odemeNotuId },
    data: { distributorRaporId: null },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "unlink",
    entity: "DistributorRapor",
    entityId: raporId,
    ozet: `Promosyon bağlantısı kaldırıldı: ${notu.baslik}`,
  });

  revalidatePath(`/uygulama/distributor/${raporId}`);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// eslesmeleriOnerErr — Track adlarını Promosyon kayıtlarına fuzzy match et
// ----------------------------------------------------------------------------

export interface EslesmeOnerisi {
  odemeNotuId: number;
  baslik: string;
  videoBasligi: string | null;
  platform: string | null;
  tutar: string;
  paraBirimi: string;
  bestTrack: string;
  score: number;
  zatenBagli: boolean;
}

export async function eslesmeleriOnerErr(
  raporId: number,
): Promise<ActionResult<EslesmeOnerisi[]>> {
  const ctx = await getOrgContext();

  const rapor = await db.distributorRapor.findFirst({
    where: { id: raporId, organizationId: ctx.orgId },
    select: { id: true, rawData: true },
  });
  if (!rapor) return { ok: false, error: "Rapor bulunamadı" };

  const raw = rapor.rawData as unknown as RawDataPayload | null;
  if (!raw || !raw.mapping || !Array.isArray(raw.rows)) {
    return { ok: true, data: [] };
  }
  const trackCol = raw.mapping.trackName;
  const trackNames: string[] = [];
  for (const r of raw.rows) {
    const v = r[trackCol];
    if (typeof v === "string" && v.trim()) trackNames.push(v.trim());
  }
  if (trackNames.length === 0) return { ok: true, data: [] };

  // Promosyon profili olan OdemeNotu'ları çek
  const promosyonNotlari = await db.odemeNotu.findMany({
    where: {
      organizationId: ctx.orgId,
      cari: { harcamaTuru: "Promosyon" },
    },
    select: {
      id: true,
      baslik: true,
      detay: true,
      tutar: true,
      paraBirimi: true,
      distributorRaporId: true,
    },
    take: 200,
    orderBy: { olusturmaTarihi: "desc" },
  });

  const oneriler: EslesmeOnerisi[] = [];
  for (const n of promosyonNotlari) {
    const detay = n.detay as { videoBasligi?: string; platform?: string } | null;
    const videoBasligi = detay?.videoBasligi ?? null;
    const platform = detay?.platform ?? null;
    const aramaMetni = videoBasligi || n.baslik;

    let bestScore = 0;
    let bestTrack = "";
    for (const t of trackNames) {
      const s = fuzzyScore(aramaMetni, t);
      if (s > bestScore) {
        bestScore = s;
        bestTrack = t;
      }
    }
    if (bestScore >= 0.4 || n.distributorRaporId === raporId) {
      oneriler.push({
        odemeNotuId: n.id,
        baslik: n.baslik,
        videoBasligi,
        platform,
        tutar: n.tutar.toString(),
        paraBirimi: n.paraBirimi,
        bestTrack,
        score: Math.round(bestScore * 100) / 100,
        zatenBagli: n.distributorRaporId === raporId,
      });
    }
  }

  oneriler.sort((a, b) => {
    if (a.zatenBagli !== b.zatenBagli) return a.zatenBagli ? -1 : 1;
    return b.score - a.score;
  });

  return { ok: true, data: oneriler };
}
