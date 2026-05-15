/**
 * Domain enum'ları + Türkçe etiketleri.
 * Prisma schema'sındaki enum'lar ile bire bir eşleşir.
 */

export const CariTipi = {
  Musteri: "Musteri",
  Tedarikci: "Tedarikci",
  HerIkisi: "HerIkisi",
} as const;
export type CariTipi = (typeof CariTipi)[keyof typeof CariTipi];

export const cariTipiEtiket: Record<CariTipi, string> = {
  Musteri: "Müşteri",
  Tedarikci: "Tedarikçi",
  HerIkisi: "Müşteri/Tedarikçi",
};

export const OdemeYonu = {
  Alacak: "Alacak",
  Borc: "Borc",
} as const;
export type OdemeYonu = (typeof OdemeYonu)[keyof typeof OdemeYonu];

export const odemeYonuEtiket: Record<OdemeYonu, string> = {
  Alacak: "Alacak",
  Borc: "Borç",
};

export const OdemeDurumu = {
  Beklemede: "Beklemede",
  Odendi: "Odendi",
  KismiOdendi: "KismiOdendi",
  Iptal: "Iptal",
} as const;
export type OdemeDurumu = (typeof OdemeDurumu)[keyof typeof OdemeDurumu];

export const odemeDurumuEtiket: Record<OdemeDurumu, string> = {
  Beklemede: "Beklemede",
  Odendi: "Ödendi",
  KismiOdendi: "Kısmi Ödendi",
  Iptal: "İptal",
};

export const FaturaYonu = {
  Gonderilen: "Gonderilen",
  Gelen: "Gelen",
} as const;
export type FaturaYonu = (typeof FaturaYonu)[keyof typeof FaturaYonu];

export const faturaYonuEtiket: Record<FaturaYonu, string> = {
  Gonderilen: "Gönderilen",
  Gelen: "Gelen",
};

export const FaturaDurumu = {
  Beklemede: "Beklemede",
  Odendi: "Odendi",
  KismiOdendi: "KismiOdendi",
  Iptal: "Iptal",
} as const;
export type FaturaDurumu = (typeof FaturaDurumu)[keyof typeof FaturaDurumu];

export const faturaDurumuEtiket: Record<FaturaDurumu, string> = {
  Beklemede: "Beklemede",
  Odendi: "Ödendi",
  KismiOdendi: "Kısmi Ödendi",
  Iptal: "İptal",
};

export const HareketTipi = {
  Borc: "Borc",
  Alacak: "Alacak",
} as const;
export type HareketTipi = (typeof HareketTipi)[keyof typeof HareketTipi];

export const hareketTipiEtiket: Record<HareketTipi, string> = {
  Borc: "Borç",
  Alacak: "Alacak",
};
