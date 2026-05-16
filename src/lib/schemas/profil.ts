import { z } from "zod";
import { CariTipi, HarcamaTuru } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const profilSchema = z.object({
  kod: z.string().min(1, "Kod zorunludur").max(50),
  unvan: z.string().min(2, "Ünvan en az 2 karakter olmalı").max(250),
  tip: z.enum([
    CariTipi.Musteri,
    CariTipi.Tedarikci,
    CariTipi.HerIkisi,
    CariTipi.Harcama,
  ]),
  harcamaTuru: z
    .union([
      z.enum([
        HarcamaTuru.Genel,
        HarcamaTuru.Promosyon,
        HarcamaTuru.Avans,
        HarcamaTuru.Ticaret,
      ]),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
  vergiNo: opt(z.string().max(50)),
  vergiDairesi: opt(z.string().max(100)),
  tcKimlikNo: opt(z.string().max(20)),
  telefon: opt(z.string().max(50)),
  email: opt(z.string().email("Geçerli bir e-posta giriniz")),
  adres: opt(z.string().max(500)),
  sehir: opt(z.string().max(100)),
  acilisBakiyesi: z.coerce
    .number({ message: "Sayı olmalı" })
    .default(0),
  notlar: opt(z.string().max(2000)),
  aktif: z.coerce.boolean().default(true),
});

export type ProfilInput = z.input<typeof profilSchema>;
export type ProfilOutput = z.output<typeof profilSchema>;
