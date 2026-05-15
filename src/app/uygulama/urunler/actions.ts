"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { StokHareketTipi } from "@/lib/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

const urunSchema = z.object({
  kod: z.string().min(1).max(50),
  ad: z.string().min(2).max(250),
  aciklama: z.string().max(2000).optional().or(z.literal("")),
  birim: z.string().min(1).max(20).default("Adet"),
  satisFiyati: z.coerce.number().nonnegative(),
  alisFiyati: z
    .union([
      z.coerce.number().nonnegative(),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .transform((v) =>
      v === "" || v === null || v === undefined ? null : (v as number),
    ),
  kdvOrani: z.coerce.number().min(0).max(100).default(20),
  paraBirimi: z.string().length(3).default("TRY"),
  stok: z.coerce.number().default(0),
  minStok: z.coerce.number().nonnegative().default(0),
  kategori: z.string().max(100).optional().or(z.literal("")),
  barkod: z.string().max(50).optional().or(z.literal("")),
  aktif: z.coerce.boolean().default(true),
});

function parseFD(formData: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("aktif" in o)) o.aktif = false;
  return urunSchema.safeParse(o);
}

export async function nextUrunKodu(): Promise<string> {
  const userId = await getUserId();
  const count = await db.urun.count({ where: { userId } });
  return `URN-${String(count + 1).padStart(4, "0")}`;
}

export async function createUrun(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = parseFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const exists = await db.urun.findFirst({
    where: { userId, kod: data.kod },
    select: { id: true },
  });
  if (exists) return { ok: false, error: `"${data.kod}" zaten kayıtlı` };

  const u = await db.urun.create({
    data: {
      userId,
      kod: data.kod,
      ad: data.ad,
      aciklama: data.aciklama || null,
      birim: data.birim,
      satisFiyati: data.satisFiyati,
      alisFiyati: data.alisFiyati,
      kdvOrani: data.kdvOrani,
      paraBirimi: data.paraBirimi,
      stok: data.stok,
      minStok: data.minStok,
      kategori: data.kategori || null,
      barkod: data.barkod || null,
      aktif: data.aktif,
    },
  });

  await logAction({
    userId,
    islem: "create",
    entity: "Urun",
    entityId: u.id,
    ozet: `Ürün eklendi: ${u.ad} (${u.kod})`,
  });

  revalidatePath("/uygulama/urunler");
  return { ok: true };
}

export async function updateUrun(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = parseFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const existing = await db.urun.findFirst({
    where: { id, userId },
    select: { id: true, kod: true },
  });
  if (!existing) return { ok: false, error: "Ürün bulunamadı" };

  if (existing.kod !== data.kod) {
    const dupe = await db.urun.findFirst({
      where: { userId, kod: data.kod, NOT: { id } },
      select: { id: true },
    });
    if (dupe) return { ok: false, error: `"${data.kod}" başka üründe kullanılıyor` };
  }

  await db.urun.update({
    where: { id },
    data: {
      kod: data.kod,
      ad: data.ad,
      aciklama: data.aciklama || null,
      birim: data.birim,
      satisFiyati: data.satisFiyati,
      alisFiyati: data.alisFiyati,
      kdvOrani: data.kdvOrani,
      paraBirimi: data.paraBirimi,
      minStok: data.minStok,
      kategori: data.kategori || null,
      barkod: data.barkod || null,
      aktif: data.aktif,
      // Stok değeri burada güncellenmez — sadece stok hareketleri ile
    },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Urun",
    entityId: id,
    ozet: `Ürün güncellendi: ${data.ad}`,
  });

  revalidatePath("/uygulama/urunler");
  return { ok: true };
}

export async function deleteUrun(id: number): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.urun.findFirst({
    where: { id, userId },
    select: { ad: true, kod: true },
  });
  if (!existing) return { ok: false, error: "Ürün bulunamadı" };

  await db.urun.delete({ where: { id } });

  await logAction({
    userId,
    islem: "delete",
    entity: "Urun",
    entityId: id,
    ozet: `Ürün silindi: ${existing.ad}`,
  });

  revalidatePath("/uygulama/urunler");
  return { ok: true };
}

const hareketSchema = z.object({
  tip: z.enum([
    StokHareketTipi.Giris,
    StokHareketTipi.Cikis,
    StokHareketTipi.Duzeltme,
  ]),
  miktar: z.coerce.number().positive(),
  birimFiyat: z
    .union([z.coerce.number().nonnegative(), z.literal(""), z.null(), z.undefined()])
    .transform((v) =>
      v === "" || v === null || v === undefined ? null : (v as number),
    ),
  notlar: z.string().max(2000).optional().or(z.literal("")),
  belgeNo: z.string().max(100).optional().or(z.literal("")),
});

export async function createStokHareketi(
  urunId: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = hareketSchema.safeParse({
    tip: formData.get("tip"),
    miktar: formData.get("miktar"),
    birimFiyat: formData.get("birimFiyat") || undefined,
    notlar: formData.get("notlar") || undefined,
    belgeNo: formData.get("belgeNo") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const urun = await db.urun.findFirst({
    where: { id: urunId, userId },
    select: { id: true, ad: true, stok: true },
  });
  if (!urun) return { ok: false, error: "Ürün bulunamadı" };

  const onceki = Number(urun.stok);
  const m = Number(parsed.data.miktar);

  let sonraki: number;
  if (parsed.data.tip === StokHareketTipi.Giris) sonraki = onceki + m;
  else if (parsed.data.tip === StokHareketTipi.Cikis) sonraki = onceki - m;
  else sonraki = m; // Düzeltme → mutlak değer

  if (sonraki < 0) {
    return {
      ok: false,
      error: `Stok negatife düşemez (mevcut: ${onceki}, çıkış: ${m})`,
    };
  }

  const toplam =
    parsed.data.birimFiyat != null
      ? +(parsed.data.birimFiyat * m).toFixed(2)
      : null;

  await db.$transaction([
    db.urun.update({
      where: { id: urunId },
      data: { stok: sonraki },
    }),
    db.stokHareketi.create({
      data: {
        userId,
        urunId,
        tip: parsed.data.tip,
        miktar: parsed.data.miktar,
        birimFiyat: parsed.data.birimFiyat,
        toplamTutar: toplam,
        notlar: parsed.data.notlar || null,
        belgeNo: parsed.data.belgeNo || null,
        tarih: new Date(),
        oncekiStok: onceki,
        sonrakiStok: sonraki,
      },
    }),
  ]);

  await logAction({
    userId,
    islem: parsed.data.tip === StokHareketTipi.Cikis ? "delete" : "create",
    entity: "Urun",
    entityId: urunId,
    ozet: `${urun.ad} — ${parsed.data.tip} ${m}, stok: ${onceki} → ${sonraki}`,
  });

  revalidatePath("/uygulama/urunler");
  revalidatePath(`/uygulama/urunler/${urunId}`);
  return { ok: true };
}
