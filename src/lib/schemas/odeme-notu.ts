import { z } from "zod";
import { OdemeYonu, OdemeDurumu } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const odemeNotuSchema = z.object({
  cariId: z.coerce.number().int().positive("Profil seçimi zorunludur"),
  yon: z.enum([OdemeYonu.Alacak, OdemeYonu.Borc]),
  baslik: z.string().min(2, "Başlık en az 2 karakter olmalı").max(250),
  aciklama: opt(z.string().max(2000)),
  tutar: z.coerce
    .number({ message: "Sayı olmalı" })
    .positive("Tutar sıfırdan büyük olmalı"),
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
  odenenTutar: z.coerce.number().nonnegative().default(0),
});

export type OdemeNotuInput = z.input<typeof odemeNotuSchema>;
export type OdemeNotuOutput = z.output<typeof odemeNotuSchema>;
