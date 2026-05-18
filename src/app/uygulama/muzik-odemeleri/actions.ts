"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgContext, getOrgId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import {
  muzikProfilSchema,
  muzikGelirSchema,
  muzikHarcamaSchema,
  sanatciOdemesiSchema,
  slugify,
} from "@/lib/schemas/muzik";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Sanatçı/promoter görünür adı: kod (sahne adı) varsa onu kullan, yoksa
 * unvan'a (gerçek isim) düş. Bu sayede müzik tarafında "DJ FLG" gözükür,
 * Profiller tarafında "Emiliano Ulloa" durmaya devam eder.
 */
function displayName(c: { kod: string; unvan: string }): string {
  if (c.kod && c.kod.trim() && c.kod !== c.unvan) return c.kod;
  return c.unvan;
}

/* ============================================================
   Selector helpers (Cari + Kasa) — client'tan çağrılır
   ============================================================ */

export async function listSanatcilarForSelect() {
  const orgId = await getOrgId();
  const rows = await db.cari.findMany({
    where: {
      organizationId: orgId,
      tip: "Harcama",
      harcamaTuru: "Sanatci",
      aktif: true,
    },
    orderBy: { kod: "asc" },
    select: { id: true, kod: true, unvan: true },
  });
  return rows.map((c) => ({ id: c.id, unvan: displayName(c) }));
}

export async function listPromoterlarForSelect() {
  const orgId = await getOrgId();
  const rows = await db.cari.findMany({
    where: {
      organizationId: orgId,
      tip: "Harcama",
      harcamaTuru: "Promoter",
      aktif: true,
    },
    orderBy: { kod: "asc" },
    select: {
      id: true,
      kod: true,
      unvan: true,
      promoterPricePerVideo: true,
      promoterTier: true,
    },
  });
  return rows.map((c) => ({
    id: c.id,
    unvan: displayName(c),
    promoterPricePerVideo: c.promoterPricePerVideo,
    promoterTier: c.promoterTier,
  }));
}

export async function listAktiveKasalarForSelect() {
  const orgId = await getOrgId();
  return db.kasa.findMany({
    where: { organizationId: orgId, aktif: true },
    orderBy: [{ varsayilan: "desc" }, { ad: "asc" }],
    select: {
      id: true,
      ad: true,
      paraBirimi: true,
      varsayilan: true,
    },
  });
}

/* ============================================================
   Slug helper — organization scope'unda unique
   ============================================================ */
async function uniqueSlug(
  organizationId: string,
  baseSlug: string,
  excludeId?: number,
): Promise<string> {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const exists = await db.muzikProfil.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!exists) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

/* ============================================================
   Sistem "Müzik Harcamaları" carisi — promoter seçilmezse köprü için kullanılır
   ============================================================ */
async function ensureSistemMuzikCarisi(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
): Promise<{ id: number }> {
  const KOD = "MUZ-SISTEM";
  const existing = await tx.cari.findFirst({
    where: { organizationId, kod: KOD },
    select: { id: true },
  });
  if (existing) return existing;
  return tx.cari.create({
    data: {
      kod: KOD,
      unvan: "Müzik Harcamaları (Sistem)",
      tip: "Harcama",
      harcamaTuru: "Genel",
      organizationId,
      userId,
      aktif: true,
    },
    select: { id: true },
  });
}

/* ============================================================
   Müzik Profili CRUD
   ============================================================ */

export async function createMuzikProfil(
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const ctx = await getOrgContext();
  const parsed = muzikProfilSchema.safeParse({
    isim: formData.get("isim"),
    sanatciCariIds: formData.get("sanatciCariIds"),
    isbirlikciler: formData.get("isbirlikciler") ?? "",
    magazalar: formData.get("magazalar") ?? "",
    notlar: formData.get("notlar"),
    ilkHarcamalar: formData.get("ilkHarcamalar") ?? "",
    ilkGelirler: formData.get("ilkGelirler") ?? "",
    ilkSanatciOdemeleri: formData.get("ilkSanatciOdemeleri") ?? "",
    varsayilanKasaId: formData.get("varsayilanKasaId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const d = parsed.data;

  const slug = await uniqueSlug(ctx.orgId, slugify(d.isim));

  const result = await db.$transaction(async (tx) => {
    const muzik = await tx.muzikProfil.create({
      data: {
        isim: d.isim,
        slug,
        isbirlikciler: d.isbirlikciler,
        magazalar: d.magazalar,
        notlar: d.notlar,
        organizationId: ctx.orgId,
        userId: ctx.userId,
        sanatcilar: {
          create: d.sanatciCariIds.map((cariId) => ({ cariId })),
        },
      },
      select: { id: true, slug: true, isim: true },
    });

    // İnline harcamalar — varsa Borçlar+Kasa köprüsüyle oluştur
    for (const h of d.ilkHarcamalar) {
      await harcamaIcinKopruIle(tx, {
        organizationId: ctx.orgId,
        userId: ctx.userId,
        muzikProfilId: muzik.id,
        muzikIsim: muzik.isim,
        tarih: h.tarih,
        kategori: h.kategori,
        tutar: h.tutar,
        paraBirimi: "USD",
        promoterCariId: null,
        kasaId: d.varsayilanKasaId,
        borclaraYansit: true,
        not: h.not,
      });
    }

    // İnline gelirler — düz kayıt (Faz 3'te opsiyonel Alacaklar köprüsü)
    for (const g of d.ilkGelirler) {
      await tx.muzikGelir.create({
        data: {
          muzikProfilId: muzik.id,
          tarih: new Date(g.tarih),
          platform: g.platform,
          tutar: g.tutar,
          paraBirimi: "USD",
          not: g.not,
          organizationId: ctx.orgId,
          userId: ctx.userId,
        },
      });
    }

    // İnline sanatçı ödemeleri — borclaraYansit=false (kasaya bağlamadan)
    for (const o of d.ilkSanatciOdemeleri) {
      // Sanatçı listesi içinde olduğundan emin ol
      if (!d.sanatciCariIds.includes(o.cariId)) continue;
      const yuzdeNot = o.yuzde
        ? `%${o.yuzde}${o.not ? ` · ${o.not}` : ""}`
        : (o.not ?? null);
      await tx.sanatciOdemesi.create({
        data: {
          muzikProfilId: muzik.id,
          sanatciCariId: o.cariId,
          tarih: new Date(o.tarih),
          tutar: o.tutar,
          paraBirimi: "USD",
          not: yuzdeNot,
          borclaraYansit: false,
          kasaId: d.varsayilanKasaId,
          organizationId: ctx.orgId,
          userId: ctx.userId,
        },
      });
    }

    return muzik;
  });

  const parts: string[] = [];
  if (d.ilkGelirler.length) parts.push(`${d.ilkGelirler.length} gelir`);
  if (d.ilkHarcamalar.length) parts.push(`${d.ilkHarcamalar.length} harcama`);
  if (d.ilkSanatciOdemeleri.length)
    parts.push(`${d.ilkSanatciOdemeleri.length} sanatçı ödemesi`);

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "MuzikProfil",
    entityId: String(result.id),
    ozet:
      `Yeni müzik: ${result.isim}` +
      (parts.length ? ` (${parts.join(", ")})` : ""),
  });

  revalidatePath("/uygulama/muzik-odemeleri");
  return { ok: true, data: { slug: result.slug } };
}

export async function deleteMuzikProfil(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const m = await db.muzikProfil.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, isim: true },
  });
  if (!m) return { ok: false, error: "Bulunamadı" };

  // Cascade ile gelir/harcama/sanatçı ödemesi de silinir; köprü kayıtları SetNull
  await db.muzikProfil.delete({ where: { id } });
  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "MuzikProfil",
    entityId: String(id),
    ozet: `Müzik silindi: ${m.isim}`,
  });
  revalidatePath("/uygulama/muzik-odemeleri");
  return { ok: true };
}

/* ============================================================
   Müzik Geliri
   ============================================================ */

export async function createMuzikGelir(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = muzikGelirSchema.safeParse({
    muzikProfilId: formData.get("muzikProfilId"),
    tarih: formData.get("tarih"),
    platform: formData.get("platform"),
    tutar: formData.get("tutar"),
    paraBirimi: formData.get("paraBirimi") ?? "USD",
    not: formData.get("not"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const d = parsed.data;

  const muzik = await db.muzikProfil.findFirst({
    where: { id: d.muzikProfilId, organizationId: ctx.orgId },
    select: { id: true, isim: true, slug: true },
  });
  if (!muzik) return { ok: false, error: "Müzik bulunamadı" };

  await db.muzikGelir.create({
    data: {
      muzikProfilId: muzik.id,
      tarih: new Date(d.tarih),
      platform: d.platform,
      tutar: d.tutar,
      paraBirimi: d.paraBirimi,
      not: d.not,
      organizationId: ctx.orgId,
      userId: ctx.userId,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "MuzikGelir",
    entityId: String(muzik.id),
    ozet: `${muzik.isim} — gelir +${d.tutar} ${d.paraBirimi}${d.platform ? ` (${d.platform})` : ""}`,
  });

  revalidatePath(`/uygulama/muzik-odemeleri/${muzik.slug}`);
  revalidatePath("/uygulama/muzik-odemeleri");
  return { ok: true };
}

export async function deleteMuzikGelir(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const g = await db.muzikGelir.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: { muzikProfil: { select: { slug: true } } },
  });
  if (!g) return { ok: false, error: "Bulunamadı" };
  await db.muzikGelir.delete({ where: { id } });
  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "MuzikGelir",
    entityId: String(id),
    ozet: `Müzik gelir silindi (${g.tutar})`,
  });
  revalidatePath(`/uygulama/muzik-odemeleri/${g.muzikProfil.slug}`);
  return { ok: true };
}

/* ============================================================
   Müzik Harcaması — Borçlar + Kasa köprüsü ile
   ============================================================ */

interface HarcamaKopruInput {
  organizationId: string;
  userId: string;
  muzikProfilId: number;
  muzikIsim: string;
  tarih: string;
  kategori: string | null;
  tutar: number;
  paraBirimi: string;
  promoterCariId: number | null;
  kasaId: number | null;
  borclaraYansit: boolean;
  not: string | null;
}

/**
 * Müzik harcaması ekler. `borclaraYansit=true` ise transaction içinde
 * `Hareket` (Borc), `OdemeNotu` (Borc, Odendi) ve opsiyonel `KasaHareketi`
 * (Cikis) kayıtları da oluşturulur ve MuzikHarcama.hareketId/odemeNotuId/
 * kasaHareketiId FK'leri set edilir.
 */
async function harcamaIcinKopruIle(
  tx: Prisma.TransactionClient,
  inp: HarcamaKopruInput,
): Promise<{ id: number }> {
  const tarihDate = new Date(inp.tarih);
  const aciklamaBase = `${inp.muzikIsim}${inp.kategori ? ` · ${inp.kategori}` : ""}`;

  if (!inp.borclaraYansit) {
    const h = await tx.muzikHarcama.create({
      data: {
        muzikProfilId: inp.muzikProfilId,
        tarih: tarihDate,
        kategori: inp.kategori as
          | "Reklam"
          | "Tasarim"
          | "Produksiyon"
          | "Klip"
          | "Mix"
          | "Master"
          | "Telif"
          | "Diger"
          | null,
        tutar: inp.tutar,
        paraBirimi: inp.paraBirimi,
        promoterCariId: inp.promoterCariId,
        kasaId: inp.kasaId,
        borclaraYansit: false,
        not: inp.not,
        organizationId: inp.organizationId,
        userId: inp.userId,
      },
      select: { id: true },
    });
    return h;
  }

  // Borçlar köprüsü: cariId belirle
  const cariId =
    inp.promoterCariId ??
    (await ensureSistemMuzikCarisi(tx, inp.organizationId, inp.userId)).id;

  const hareket = await tx.hareket.create({
    data: {
      cariId,
      tarih: tarihDate,
      tip: "Borc",
      tutar: inp.tutar,
      paraBirimi: inp.paraBirimi,
      aciklama: aciklamaBase,
      organizationId: inp.organizationId,
      userId: inp.userId,
    },
    select: { id: true },
  });

  const odemeNotu = await tx.odemeNotu.create({
    data: {
      cariId,
      yon: "Borc",
      durum: "Odendi",
      baslik: aciklamaBase,
      tutar: inp.tutar,
      paraBirimi: inp.paraBirimi,
      vadeTarihi: tarihDate,
      odenenTutar: inp.tutar,
      odemeTarihi: tarihDate,
      organizationId: inp.organizationId,
      userId: inp.userId,
    },
    select: { id: true },
  });

  let kasaHareketiId: number | null = null;
  if (inp.kasaId) {
    const kasaH = await tx.kasaHareketi.create({
      data: {
        kasaId: inp.kasaId,
        tip: "Cikis",
        tutar: inp.tutar,
        paraBirimi: inp.paraBirimi,
        tarih: tarihDate,
        aciklama: aciklamaBase,
        organizationId: inp.organizationId,
        userId: inp.userId,
      },
      select: { id: true },
    });
    kasaHareketiId = kasaH.id;
  }

  const muzikH = await tx.muzikHarcama.create({
    data: {
      muzikProfilId: inp.muzikProfilId,
      tarih: tarihDate,
      kategori: inp.kategori as
        | "Reklam"
        | "Tasarim"
        | "Produksiyon"
        | "Klip"
        | "Mix"
        | "Master"
        | "Telif"
        | "Diger"
        | null,
      tutar: inp.tutar,
      paraBirimi: inp.paraBirimi,
      promoterCariId: inp.promoterCariId,
      kasaId: inp.kasaId,
      borclaraYansit: true,
      not: inp.not,
      hareketId: hareket.id,
      odemeNotuId: odemeNotu.id,
      kasaHareketiId,
      organizationId: inp.organizationId,
      userId: inp.userId,
    },
    select: { id: true },
  });
  return muzikH;
}

export async function createMuzikHarcama(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = muzikHarcamaSchema.safeParse({
    muzikProfilId: formData.get("muzikProfilId"),
    tarih: formData.get("tarih"),
    kategori: formData.get("kategori"),
    tutar: formData.get("tutar"),
    paraBirimi: formData.get("paraBirimi") ?? "USD",
    promoterCariId: formData.get("promoterCariId"),
    kasaId: formData.get("kasaId"),
    borclaraYansit: formData.get("borclaraYansit") === "true",
    not: formData.get("not"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const d = parsed.data;

  const muzik = await db.muzikProfil.findFirst({
    where: { id: d.muzikProfilId, organizationId: ctx.orgId },
    select: { id: true, isim: true, slug: true },
  });
  if (!muzik) return { ok: false, error: "Müzik bulunamadı" };

  await db.$transaction(async (tx) => {
    await harcamaIcinKopruIle(tx, {
      organizationId: ctx.orgId,
      userId: ctx.userId,
      muzikProfilId: muzik.id,
      muzikIsim: muzik.isim,
      tarih: d.tarih,
      kategori: d.kategori,
      tutar: d.tutar,
      paraBirimi: d.paraBirimi,
      promoterCariId: d.promoterCariId,
      kasaId: d.kasaId,
      borclaraYansit: d.borclaraYansit,
      not: d.not,
    });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "MuzikHarcama",
    entityId: String(muzik.id),
    ozet: `${muzik.isim} — harcama -${d.tutar} ${d.paraBirimi}${d.borclaraYansit ? " · Borçlar'a yansıdı" : ""}`,
  });

  revalidatePath(`/uygulama/muzik-odemeleri/${muzik.slug}`);
  revalidatePath("/uygulama/muzik-odemeleri");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/hareketler");
  return { ok: true };
}

export async function deleteMuzikHarcama(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const h = await db.muzikHarcama.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: { muzikProfil: { select: { slug: true } } },
  });
  if (!h) return { ok: false, error: "Bulunamadı" };

  // Köprü kayıtlarını da temizle (SetNull cascade etmez, manuel)
  await db.$transaction(async (tx) => {
    if (h.hareketId) await tx.hareket.delete({ where: { id: h.hareketId } }).catch(() => {});
    if (h.odemeNotuId) await tx.odemeNotu.delete({ where: { id: h.odemeNotuId } }).catch(() => {});
    if (h.kasaHareketiId)
      await tx.kasaHareketi.delete({ where: { id: h.kasaHareketiId } }).catch(() => {});
    await tx.muzikHarcama.delete({ where: { id } });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "MuzikHarcama",
    entityId: String(id),
    ozet: `Müzik harcama silindi (${h.tutar})`,
  });

  revalidatePath(`/uygulama/muzik-odemeleri/${h.muzikProfil.slug}`);
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/hareketler");
  return { ok: true };
}

/* ============================================================
   Sanatçı Ödemesi — aynı pattern
   ============================================================ */

export async function createSanatciOdemesi(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = sanatciOdemesiSchema.safeParse({
    muzikProfilId: formData.get("muzikProfilId"),
    sanatciCariId: formData.get("sanatciCariId"),
    tarih: formData.get("tarih"),
    tutar: formData.get("tutar"),
    paraBirimi: formData.get("paraBirimi") ?? "USD",
    kasaId: formData.get("kasaId"),
    borclaraYansit: formData.get("borclaraYansit") === "true",
    not: formData.get("not"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const d = parsed.data;

  const [muzik, sanatci] = await Promise.all([
    db.muzikProfil.findFirst({
      where: { id: d.muzikProfilId, organizationId: ctx.orgId },
      select: { id: true, isim: true, slug: true },
    }),
    db.cari.findFirst({
      where: { id: d.sanatciCariId, organizationId: ctx.orgId },
      select: { id: true, unvan: true },
    }),
  ]);
  if (!muzik) return { ok: false, error: "Müzik bulunamadı" };
  if (!sanatci) return { ok: false, error: "Sanatçı bulunamadı" };

  await db.$transaction(async (tx) => {
    const tarihDate = new Date(d.tarih);
    const aciklama = `${muzik.isim} · ${sanatci.unvan}`;

    let hareketId: number | null = null;
    let odemeNotuId: number | null = null;
    if (d.borclaraYansit) {
      const hareket = await tx.hareket.create({
        data: {
          cariId: sanatci.id,
          tarih: tarihDate,
          tip: "Borc",
          tutar: d.tutar,
          paraBirimi: d.paraBirimi,
          aciklama,
          organizationId: ctx.orgId,
          userId: ctx.userId,
        },
        select: { id: true },
      });
      hareketId = hareket.id;

      const odemeNotu = await tx.odemeNotu.create({
        data: {
          cariId: sanatci.id,
          yon: "Borc",
          durum: "Odendi",
          baslik: aciklama,
          tutar: d.tutar,
          paraBirimi: d.paraBirimi,
          vadeTarihi: tarihDate,
          odenenTutar: d.tutar,
          odemeTarihi: tarihDate,
          organizationId: ctx.orgId,
          userId: ctx.userId,
        },
        select: { id: true },
      });
      odemeNotuId = odemeNotu.id;
    }

    await tx.sanatciOdemesi.create({
      data: {
        muzikProfilId: muzik.id,
        sanatciCariId: sanatci.id,
        tarih: tarihDate,
        tutar: d.tutar,
        paraBirimi: d.paraBirimi,
        kasaId: d.kasaId,
        borclaraYansit: d.borclaraYansit,
        not: d.not,
        hareketId,
        odemeNotuId,
        organizationId: ctx.orgId,
        userId: ctx.userId,
      },
    });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "SanatciOdemesi",
    entityId: String(muzik.id),
    ozet: `${muzik.isim} — ${sanatci.unvan}'a ödeme ${d.tutar} ${d.paraBirimi}`,
  });

  revalidatePath(`/uygulama/muzik-odemeleri/${muzik.slug}`);
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/hareketler");
  return { ok: true };
}

export async function deleteSanatciOdemesi(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const o = await db.sanatciOdemesi.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: { muzikProfil: { select: { slug: true } } },
  });
  if (!o) return { ok: false, error: "Bulunamadı" };

  await db.$transaction(async (tx) => {
    if (o.hareketId) await tx.hareket.delete({ where: { id: o.hareketId } }).catch(() => {});
    if (o.odemeNotuId)
      await tx.odemeNotu.delete({ where: { id: o.odemeNotuId } }).catch(() => {});
    await tx.sanatciOdemesi.delete({ where: { id } });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "SanatciOdemesi",
    entityId: String(id),
    ozet: `Sanatçı ödemesi silindi (${o.tutar})`,
  });

  revalidatePath(`/uygulama/muzik-odemeleri/${o.muzikProfil.slug}`);
  return { ok: true };
}
