import { z } from "zod";
import {
  MuzikMagaza,
  MuzikHarcamaKategori,
  OdemeYonu,
  OdemeDurumu,
} from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

const csvIntList = z
  .union([z.string(), z.array(z.coerce.number().int()), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter((n) => Number.isInteger(n) && n > 0);
    return v
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  });

const lineList = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (!v) return [];
    const values = Array.isArray(v) ? v : v.split("\n");
    return values.map((x) => x.trim()).filter(Boolean);
  });

const magazaList = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (!v) return [];
    const values = Array.isArray(v) ? v : v.split(",");
    const valid = new Set(Object.values(MuzikMagaza) as string[]);
    return values
      .map((x) => x.trim())
      .filter((x): x is MuzikMagaza => valid.has(x));
  });

const sanatciOdemeleri = z
  .union([z.string(), z.array(z.unknown()), z.null(), z.undefined()])
  .optional()
  .transform((v, ctx) => {
    if (!v) return [];
    const parsed = typeof v === "string" ? (() => {
      try {
        return v.trim() ? JSON.parse(v) : [];
      } catch {
        ctx.addIssue({ code: "custom", message: "Sanatçı ödemeleri hatalı" });
        return z.NEVER;
      }
    })() : v;
    const validated = z
      .array(
        z.object({
          cariId: z.coerce.number().int().positive(),
          tutar: z.coerce.number().positive(),
        }),
      )
      .safeParse(parsed);
    if (!validated.success) {
      ctx.addIssue({ code: "custom", message: "Sanatçı ödemeleri hatalı" });
      return z.NEVER;
    }
    return validated.data;
  });

export const odemeNotuSchema = z.object({
  cariId: z.coerce.number().int().positive("Profil seçimi zorunludur"),
  yon: z.enum([OdemeYonu.Alacak, OdemeYonu.Borc]),
  baslik: z.string().min(2, "Başlık en az 2 karakter olmalı").max(250),
  aciklama: opt(z.string().max(2000)),
  tutar: z.coerce
    .number({ message: "Sayı olmalı" })
    .positive("Tutar sıfırdan büyük olmalı")
    .lte(999_999_999_999_999.99, "Tutar çok büyük (max 999 trilyon)")
    .refine((v) => Number.isFinite(v), "Tutar geçersiz"),
  paraBirimi: z.string().length(3).default("TRY"),
  vadeTarihi: z.coerce.date({ message: "Vade tarihi geçersiz" }),
  durum: z
    .enum([
      OdemeDurumu.Beklemede,
      OdemeDurumu.Odendi,
      OdemeDurumu.KismiOdendi,
      OdemeDurumu.Iptal,
    ])
    .default(OdemeDurumu.Beklemede),
  odenenTutar: z.coerce
    .number()
    .nonnegative()
    .lte(999_999_999_999_999.99, "Tutar çok büyük")
    .default(0),
  detay: z.unknown().optional().nullable(),
});

/* ----------------------------------------------------------------
   Türe göre detay şemaları (esnek — extra alanlar tolere edilir)
   ----------------------------------------------------------------*/
export const detayPromosyonSchema = z
  .object({
    hedefCariId: z.coerce.number().int().positive().optional().nullable(),
    videoUrl: z.string().max(500).optional().nullable(),
    videoBasligi: z.string().max(250).optional().nullable(),
    platform: z.string().max(50).optional().nullable(),
  })
  .passthrough();

export const detayTicaretSchema = z
  .object({
    getiri: z.coerce.number().optional().nullable(),
  })
  .passthrough();

export const detayAvansSchema = z
  .object({
    geriOdemeTarihi: z.string().optional().nullable(),
    geriOdendi: z.coerce.boolean().optional().nullable(),
    geriOdenenTutar: z.coerce.number().optional().nullable(),
  })
  .passthrough();

export const detayGelirSchema = z
  .object({
    isMuzikGeliri: z
      .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal(""), z.null(), z.undefined()])
      .transform((v) => v === true || v === "true"),
    muzikProfilId: z.coerce.number().int().positive().optional().nullable(),
    yeniSarkiAdi: z.string().max(250).optional().nullable(),
    platform: z
      .union([
        z.enum(Object.values(MuzikMagaza) as [MuzikMagaza, ...MuzikMagaza[]]),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
    sarkiAdi: z.string().max(250).optional().nullable(),
    sanatciCariIds: csvIntList,
    isbirlikciler: lineList,
    magazalar: magazaList,
    notlar: opt(z.string().max(2000)),
    sanatciOdemeleri,
    sanatciOdemesiIds: csvIntList,
    muzikGelirId: z.coerce.number().int().positive().optional().nullable(),
  })
  .passthrough();

/**
 * Borç tarafında "Müzik harcaması olarak da kaydet" switch'i için detay.
 * isMuzikHarcamasi=true ise OdemeNotu(Borç) + MuzikHarcama eş zamanlı yaratılır.
 */
export const detayBorcMuzikSchema = z
  .object({
    isMuzikHarcamasi: z
      .union([
        z.boolean(),
        z.literal("true"),
        z.literal("false"),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .transform((v) => v === true || v === "true"),
    muzikProfilId: z.coerce.number().int().positive().optional().nullable(),
    yeniSarkiAdi: z.string().max(250).optional().nullable(),
    kategori: z
      .union([
        z.enum(
          Object.values(MuzikHarcamaKategori) as [
            MuzikHarcamaKategori,
            ...MuzikHarcamaKategori[],
          ],
        ),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
    sarkiAdi: z.string().max(250).optional().nullable(),
    sanatciCariIds: csvIntList,
    isbirlikciler: lineList,
    magazalar: magazaList,
    notlar: opt(z.string().max(2000)),
    sanatciOdemeleri,
    sanatciOdemesiIds: csvIntList,
    muzikHarcamaId: z.coerce.number().int().positive().optional().nullable(),
  })
  .passthrough();

export type OdemeNotuInput = z.input<typeof odemeNotuSchema>;
export type OdemeNotuOutput = z.output<typeof odemeNotuSchema>;
