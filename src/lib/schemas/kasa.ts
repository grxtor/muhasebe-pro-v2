import { z } from "zod";
import { KasaHareketTip } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

/* ============================================================
   Kasa (TL Ana Kasa, Dolar Kasası, ...)
   ============================================================ */
export const kasaSchema = z.object({
  ad: z.string().min(2, "Ad en az 2 karakter olmalı").max(100),
  paraBirimi: z
    .string()
    .length(3, "Para birimi 3 karakter olmalı")
    .default("TRY"),
  acilis: z.coerce
    .number({ message: "Açılış bakiyesi sayı olmalı" })
    .default(0),
  aciklama: opt(z.string().max(2000)),
  aktif: z.coerce.boolean().default(true),
  varsayilan: z.coerce.boolean().default(false),
});

export type KasaInput = z.input<typeof kasaSchema>;
export type KasaOutput = z.output<typeof kasaSchema>;

/* ============================================================
   Kasa hareketi (Giris / Cikis / Transfer)
   ============================================================ */
export const kasaHareketiSchema = z
  .object({
    kasaId: z.coerce.number().int().positive("Kasa seçimi zorunludur"),
    hedefKasaId: z
      .union([z.coerce.number().int().positive(), z.literal(""), z.null(), z.undefined()])
      .transform((v) =>
        v === "" || v === null || v === undefined ? null : (v as number),
      ),
    tip: z.enum([
      KasaHareketTip.Giris,
      KasaHareketTip.Cikis,
      KasaHareketTip.Transfer,
    ]),
    tutar: z.coerce
      .number({ message: "Tutar sayı olmalı" })
      .positive("Tutar sıfırdan büyük olmalı"),
    tarih: z.coerce.date({ message: "Tarih geçersiz" }),
    aciklama: opt(z.string().max(2000)),
    belgeNo: opt(z.string().max(100)),
  })
  .superRefine((val, ctx) => {
    if (val.tip === KasaHareketTip.Transfer) {
      if (!val.hedefKasaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hedefKasaId"],
          message: "Transfer için hedef kasa seçilmeli",
        });
      } else if (val.hedefKasaId === val.kasaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hedefKasaId"],
          message: "Hedef kasa kaynak kasadan farklı olmalı",
        });
      }
    }
  });

export type KasaHareketiInput = z.input<typeof kasaHareketiSchema>;
export type KasaHareketiOutput = z.output<typeof kasaHareketiSchema>;
