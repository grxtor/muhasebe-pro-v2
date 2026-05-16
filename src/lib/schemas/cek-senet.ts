import { z } from "zod";
import { CekSenetTip, CekSenetYon, CekSenetDurum } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

const optInt = z
  .union([
    z.coerce.number().int().positive(),
    z.literal(""),
    z.literal(0),
    z.null(),
    z.undefined(),
  ])
  .transform((v) =>
    v === "" || v === 0 || v === null || v === undefined ? null : (v as number),
  );

const optDate = z
  .union([z.coerce.date(), z.literal(""), z.null(), z.undefined()])
  .transform((v) =>
    v === "" || v === null || v === undefined ? null : (v as Date),
  );

export const cekSenetSchema = z.object({
  tip: z.enum([CekSenetTip.Cek, CekSenetTip.Senet]),
  yon: z.enum([CekSenetYon.Alinan, CekSenetYon.Verilen]),
  durum: z
    .enum([
      CekSenetDurum.Portfoyde,
      CekSenetDurum.TahsileGonderildi,
      CekSenetDurum.Tahsil,
      CekSenetDurum.Iade,
      CekSenetDurum.Karsiliksiz,
      CekSenetDurum.Iptal,
    ])
    .default(CekSenetDurum.Portfoyde),
  cariId: optInt,
  belgeNo: z.string().min(1, "Belge no zorunludur").max(50),
  bankaAdi: opt(z.string().max(100)),
  sube: opt(z.string().max(100)),
  hesapNo: opt(z.string().max(50)),
  keside: opt(z.string().max(100)),
  tutar: z.coerce
    .number({ message: "Tutar sayı olmalı" })
    .positive("Tutar sıfırdan büyük olmalı"),
  paraBirimi: z.string().length(3, "Para birimi 3 karakter olmalı").default("TRY"),
  kesideTarihi: z.coerce.date({ message: "Keşide tarihi geçersiz" }),
  vadeTarihi: z.coerce.date({ message: "Vade tarihi geçersiz" }),
  tahsilTarihi: optDate,
  aciklama: opt(z.string().max(2000)),
});

export type CekSenetInput = z.input<typeof cekSenetSchema>;
export type CekSenetOutput = z.output<typeof cekSenetSchema>;

export const cekSenetDurumGuncelleSchema = z.object({
  durum: z.enum([
    CekSenetDurum.Portfoyde,
    CekSenetDurum.TahsileGonderildi,
    CekSenetDurum.Tahsil,
    CekSenetDurum.Iade,
    CekSenetDurum.Karsiliksiz,
    CekSenetDurum.Iptal,
  ]),
  tahsilTarihi: optDate,
});

export type CekSenetDurumGuncelleInput = z.input<typeof cekSenetDurumGuncelleSchema>;
export type CekSenetDurumGuncelleOutput = z.output<typeof cekSenetDurumGuncelleSchema>;

// ============================================================
//  Type guard'lar — URL params validation için (sync, server actions
//  dosyasında bulunamaz: "use server" tüm exportların async olmasını ister)
// ============================================================

export function isCekSenetTip(v: unknown): v is CekSenetTip {
  return v === CekSenetTip.Cek || v === CekSenetTip.Senet;
}

export function isCekSenetYon(v: unknown): v is CekSenetYon {
  return v === CekSenetYon.Alinan || v === CekSenetYon.Verilen;
}

export function isCekSenetDurum(v: unknown): v is CekSenetDurum {
  return (
    v === CekSenetDurum.Portfoyde ||
    v === CekSenetDurum.TahsileGonderildi ||
    v === CekSenetDurum.Tahsil ||
    v === CekSenetDurum.Iade ||
    v === CekSenetDurum.Karsiliksiz ||
    v === CekSenetDurum.Iptal
  );
}
