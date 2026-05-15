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

/* ============================================================
   Hatırlatıcı öncelikleri
   ============================================================ */
export const HatirlaticiOncelik = {
  Dusuk: "Dusuk",
  Normal: "Normal",
  Yuksek: "Yuksek",
} as const;
export type HatirlaticiOncelik =
  (typeof HatirlaticiOncelik)[keyof typeof HatirlaticiOncelik];

export const hatirlaticiOncelikEtiket: Record<HatirlaticiOncelik, string> = {
  Dusuk: "Düşük",
  Normal: "Normal",
  Yuksek: "Yüksek",
};

/* ============================================================
   Tekrar sıklığı
   ============================================================ */
export const TekrarSiklik = {
  Gunluk: "Gunluk",
  Haftalik: "Haftalik",
  Aylik: "Aylik",
  Uc_Aylik: "Uc_Aylik",
  Alti_Aylik: "Alti_Aylik",
  Yillik: "Yillik",
} as const;
export type TekrarSiklik = (typeof TekrarSiklik)[keyof typeof TekrarSiklik];

export const tekrarSiklikEtiket: Record<TekrarSiklik, string> = {
  Gunluk: "Günlük",
  Haftalik: "Haftalık",
  Aylik: "Aylık",
  Uc_Aylik: "3 Aylık",
  Alti_Aylik: "6 Aylık",
  Yillik: "Yıllık",
};

export const TekrarTip = {
  Fatura: "Fatura",
  OdemeNotu: "OdemeNotu",
} as const;
export type TekrarTip = (typeof TekrarTip)[keyof typeof TekrarTip];

export const tekrarTipEtiket: Record<TekrarTip, string> = {
  Fatura: "Fatura",
  OdemeNotu: "Alacak / Borç",
};

/* ============================================================
   Stok hareket tipi
   ============================================================ */
export const StokHareketTipi = {
  Giris: "Giris",
  Cikis: "Cikis",
  Duzeltme: "Duzeltme",
} as const;
export type StokHareketTipi =
  (typeof StokHareketTipi)[keyof typeof StokHareketTipi];

export const stokHareketTipiEtiket: Record<StokHareketTipi, string> = {
  Giris: "Giriş",
  Cikis: "Çıkış",
  Duzeltme: "Düzeltme",
};

/* ============================================================
   Etiket renkleri (Tag.renk)
   ============================================================ */
export const TAG_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const tagColorClass: Record<
  TagColor,
  { bg: string; text: string; border: string }
> = {
  gray: {
    bg: "var(--surface-muted)",
    text: "var(--text-muted)",
    border: "var(--border)",
  },
  red: {
    bg: "var(--negative-soft)",
    text: "var(--negative)",
    border: "color-mix(in oklch, var(--negative) 30%, transparent)",
  },
  orange: {
    bg: "var(--warning-soft)",
    text: "var(--warning)",
    border: "color-mix(in oklch, var(--warning) 30%, transparent)",
  },
  yellow: {
    bg: "oklch(0.95 0.08 90)",
    text: "oklch(0.5 0.13 90)",
    border: "oklch(0.7 0.13 90 / 0.4)",
  },
  green: {
    bg: "var(--positive-soft)",
    text: "var(--positive)",
    border: "color-mix(in oklch, var(--positive) 30%, transparent)",
  },
  blue: {
    bg: "oklch(0.95 0.05 250)",
    text: "oklch(0.5 0.18 250)",
    border: "oklch(0.7 0.15 250 / 0.4)",
  },
  purple: {
    bg: "oklch(0.95 0.05 290)",
    text: "oklch(0.5 0.18 290)",
    border: "oklch(0.7 0.15 290 / 0.4)",
  },
  pink: {
    bg: "oklch(0.95 0.05 350)",
    text: "oklch(0.55 0.18 350)",
    border: "oklch(0.7 0.15 350 / 0.4)",
  },
};
