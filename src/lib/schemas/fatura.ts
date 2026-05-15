import { z } from "zod";
import { FaturaYonu, FaturaDurumu } from "../enums";

const opt = (s: z.ZodString) =>
  z
    .union([s, z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const faturaSchema = z.object({
  cariId: z.coerce.number().int().positive("Profil seçimi zorunludur"),
  yon: z.enum([FaturaYonu.Gonderilen, FaturaYonu.Gelen]),
  faturaNo: z.string().min(1, "Fatura no zorunludur").max(50),
  tarih: z.coerce.date(),
  vadeTarihi: z
    .union([z.coerce.date(), z.literal(""), z.null(), z.undefined()])
    .transform((v) =>
      v === "" || v === null || v === undefined ? null : (v as Date),
    ),
  isAciklamasi: z.string().min(2, "İş açıklaması zorunludur").max(2000),
  tutar: z.coerce.number().positive("Tutar sıfırdan büyük olmalı"),
  kdvOrani: z.coerce.number().nonnegative().max(100).default(20),
  paraBirimi: z.string().length(3).default("TRY"),
  durum: z
    .enum([
      FaturaDurumu.Beklemede,
      FaturaDurumu.Odendi,
      FaturaDurumu.KismiOdendi,
      FaturaDurumu.Iptal,
    ])
    .default(FaturaDurumu.Beklemede),
  notlar: opt(z.string().max(2000)),
  // Create akışında otomatik OdemeNotu üretimi için
  odemeNotuOlustur: z.coerce.boolean().default(true),
});

export type FaturaInput = z.input<typeof faturaSchema>;
export type FaturaOutput = z.output<typeof faturaSchema>;
