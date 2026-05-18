import { z } from "zod";
import { MuzikMagaza, MuzikHarcamaKategori } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

const optInt = z
  .union([z.coerce.number().int(), z.literal(""), z.null(), z.undefined()])
  .transform((v) =>
    v === "" || v === null || v === undefined ? null : Number(v),
  );

const optEnum = <T extends string>(values: T[]) =>
  z
    .union([z.enum(values as [T, ...T[]]), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

/* ============================================================
   MuzikProfil — yeni müzik oluşturma
   ============================================================ */

const inlineHarcamaSchema = z.object({
  tarih: z.string().min(1),
  kategori: optEnum(
    Object.values(MuzikHarcamaKategori) as MuzikHarcamaKategori[],
  ),
  tutar: z.coerce.number().positive("Tutar > 0 olmalı"),
  not: opt(z.string().max(500)),
});

const inlineGelirSchema = z.object({
  tarih: z.string().min(1),
  platform: optEnum(Object.values(MuzikMagaza) as MuzikMagaza[]),
  tutar: z.coerce.number().positive("Tutar > 0"),
  not: opt(z.string().max(500)),
});

const inlineSanatciOdemesiSchema = z.object({
  cariId: z.coerce.number().int().positive(),
  tarih: z.string().min(1),
  tutar: z.coerce.number().positive(),
  yuzde: z.union([z.coerce.number(), z.null()]).optional(),
  not: opt(z.string().max(500)),
});

export const muzikProfilSchema = z.object({
  isim: z.string().min(1, "İsim zorunlu").max(250),
  // CSV gibi virgülle ayrılmış sanatçı cariId listesi
  sanatciCariIds: z
    .string()
    .min(1, "En az bir sanatçı seçilmeli")
    .transform((s) =>
      s
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
    )
    .refine((arr) => arr.length > 0, "En az bir sanatçı"),
  // Satır başına bir işbirlikçi
  isbirlikciler: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    ),
  // CSV mağaza enum'ları
  magazalar: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? (s
            .split(",")
            .map((x) => x.trim())
            .filter((x) =>
              (Object.values(MuzikMagaza) as string[]).includes(x),
            ) as MuzikMagaza[])
        : [],
    ),
  notlar: opt(z.string().max(2000)),
  // İsteğe bağlı inline harcamalar (JSON string olarak post edilir)
  ilkHarcamalar: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return [] as z.infer<typeof inlineHarcamaSchema>[];
      try {
        const parsed = JSON.parse(s);
        const validated = z.array(inlineHarcamaSchema).safeParse(parsed);
        if (!validated.success) {
          ctx.addIssue({
            code: "custom",
            message: "İlk harcamalar formatı hatalı",
          });
          return z.NEVER;
        }
        return validated.data;
      } catch {
        ctx.addIssue({ code: "custom", message: "İlk harcamalar JSON parse hatası" });
        return z.NEVER;
      }
    }),
  // İsteğe bağlı inline gelirler
  ilkGelirler: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return [] as z.infer<typeof inlineGelirSchema>[];
      try {
        const parsed = JSON.parse(s);
        const validated = z.array(inlineGelirSchema).safeParse(parsed);
        if (!validated.success) {
          ctx.addIssue({
            code: "custom",
            message: "İlk gelirler formatı hatalı",
          });
          return z.NEVER;
        }
        return validated.data;
      } catch {
        ctx.addIssue({ code: "custom", message: "İlk gelirler JSON parse hatası" });
        return z.NEVER;
      }
    }),
  // İsteğe bağlı inline sanatçı ödemeleri (sanatçı ekleme satırının yanındaki tutar)
  ilkSanatciOdemeleri: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return [] as z.infer<typeof inlineSanatciOdemesiSchema>[];
      try {
        const parsed = JSON.parse(s);
        const validated = z.array(inlineSanatciOdemesiSchema).safeParse(parsed);
        if (!validated.success) {
          ctx.addIssue({
            code: "custom",
            message: "Sanatçı ödemeleri formatı hatalı",
          });
          return z.NEVER;
        }
        return validated.data;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Sanatçı ödemeleri JSON parse hatası",
        });
        return z.NEVER;
      }
    }),
  // Varsayılan kasa (inline harcamalar/ödemeler için)
  varsayilanKasaId: optInt,
});

export type MuzikProfilInput = z.input<typeof muzikProfilSchema>;
export type MuzikProfilOutput = z.output<typeof muzikProfilSchema>;

/* ============================================================
   Müzik Geliri
   ============================================================ */

export const muzikGelirSchema = z.object({
  muzikProfilId: z.coerce.number().int().positive(),
  tarih: z.string().min(1),
  platform: optEnum(Object.values(MuzikMagaza) as MuzikMagaza[]),
  tutar: z.coerce.number().positive("Tutar > 0"),
  paraBirimi: z.string().min(1).max(3).default("USD"),
  not: opt(z.string().max(500)),
});

export type MuzikGelirInput = z.input<typeof muzikGelirSchema>;

/* ============================================================
   Müzik Harcaması
   ============================================================ */

export const muzikHarcamaSchema = z.object({
  muzikProfilId: z.coerce.number().int().positive(),
  tarih: z.string().min(1),
  kategori: optEnum(
    Object.values(MuzikHarcamaKategori) as MuzikHarcamaKategori[],
  ),
  tutar: z.coerce.number().positive("Tutar > 0"),
  paraBirimi: z.string().min(1).max(3).default("USD"),
  promoterCariId: optInt,
  kasaId: optInt,
  borclaraYansit: z.coerce.boolean().default(true),
  not: opt(z.string().max(500)),
});

export type MuzikHarcamaInput = z.input<typeof muzikHarcamaSchema>;

/* ============================================================
   Sanatçı Ödemesi
   ============================================================ */

export const sanatciOdemesiSchema = z.object({
  muzikProfilId: z.coerce.number().int().positive(),
  sanatciCariId: z.coerce.number().int().positive("Sanatçı seçilmeli"),
  tarih: z.string().min(1),
  tutar: z.coerce.number().positive("Tutar > 0"),
  paraBirimi: z.string().min(1).max(3).default("USD"),
  kasaId: optInt,
  borclaraYansit: z.coerce.boolean().default(true),
  not: opt(z.string().max(500)),
});

export type SanatciOdemesiInput = z.input<typeof sanatciOdemesiSchema>;

/* ============================================================
   Helper: slug üretici
   ============================================================ */

export function slugify(isim: string): string {
  return isim
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "muzik";
}
