/**
 * Domain enum'ları + Türkçe etiketleri.
 * Prisma schema'sındaki enum'lar ile bire bir eşleşir.
 */

export const CariTipi = {
  Musteri: "Musteri",
  Tedarikci: "Tedarikci",
  HerIkisi: "HerIkisi",
  Harcama: "Harcama",
} as const;
export type CariTipi = (typeof CariTipi)[keyof typeof CariTipi];

export const cariTipiEtiket: Record<CariTipi, string> = {
  Musteri: "Müşteri",
  Tedarikci: "Tedarikçi",
  HerIkisi: "Müşteri/Tedarikçi",
  Harcama: "Harcama",
};

// Harcama profili alt-kategorisi (sadece tip=Harcama için)
export const HarcamaTuru = {
  Genel: "Genel",
  Promosyon: "Promosyon",
  Avans: "Avans",
  Ticaret: "Ticaret",
  Sanatci: "Sanatci",
  Promoter: "Promoter",
  Isbirlikci: "Isbirlikci",
} as const;
export type HarcamaTuru = (typeof HarcamaTuru)[keyof typeof HarcamaTuru];

export const harcamaTuruEtiket: Record<HarcamaTuru, string> = {
  Genel: "Genel",
  Promosyon: "Promosyon",
  Avans: "Avans",
  Ticaret: "Ticaret",
  Sanatci: "Sanatçı",
  Promoter: "Promoter / Reklamcı",
  Isbirlikci: "İşbirlikçi",
};

export const harcamaTuruAciklama: Record<HarcamaTuru, string> = {
  Genel: "Klasik genel harcama (kira, fatura, ofis vs.)",
  Promosyon: "Bir sanatçı/şarkı/video için yapılan tanıtım harcaması (legacy)",
  Avans: "Geri alınabilir ileri tarihli ödeme",
  Ticaret: "Yatırım + getiri (alım-satım, döviz, kripto vs.)",
  Sanatci: "Müzik sanatçısı — telif/payout alır",
  Promoter: "İçerik üreticisi / influencer — reklam karşılığı ödeme",
  Isbirlikci: "Mix engineer, master, yapımcı, tasarımcı vs.",
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

// ============================================================
//  Çek / Senet
// ============================================================

export const CekSenetTip = {
  Cek: "Cek",
  Senet: "Senet",
} as const;
export type CekSenetTip = (typeof CekSenetTip)[keyof typeof CekSenetTip];

export const cekSenetTipEtiket: Record<CekSenetTip, string> = {
  Cek: "Çek",
  Senet: "Senet",
};

export const CekSenetYon = {
  Alinan: "Alinan",
  Verilen: "Verilen",
} as const;
export type CekSenetYon = (typeof CekSenetYon)[keyof typeof CekSenetYon];

export const cekSenetYonEtiket: Record<CekSenetYon, string> = {
  Alinan: "Alınan",
  Verilen: "Verilen",
};

export const CekSenetDurum = {
  Portfoyde: "Portfoyde",
  TahsileGonderildi: "TahsileGonderildi",
  Tahsil: "Tahsil",
  Iade: "Iade",
  Karsiliksiz: "Karsiliksiz",
  Iptal: "Iptal",
} as const;
export type CekSenetDurum = (typeof CekSenetDurum)[keyof typeof CekSenetDurum];

export const cekSenetDurumEtiket: Record<CekSenetDurum, string> = {
  Portfoyde: "Portföyde",
  TahsileGonderildi: "Tahsile Gönderildi",
  Tahsil: "Tahsil Edildi",
  Iade: "İade Edildi",
  Karsiliksiz: "Karşılıksız",
  Iptal: "İptal",
};

// ============================================================
//  Kasa
// ============================================================

export const KasaHareketTip = {
  Giris: "Giris",
  Cikis: "Cikis",
  Transfer: "Transfer",
} as const;
export type KasaHareketTip = (typeof KasaHareketTip)[keyof typeof KasaHareketTip];

export const kasaHareketTipEtiket: Record<KasaHareketTip, string> = {
  Giris: "Giriş",
  Cikis: "Çıkış",
  Transfer: "Transfer",
};

// ============================================================
//  Promoter / İçerik Üreticileri
// ============================================================

export const PromoterNiche = {
  Anime: "Anime",
  Football: "Football",
  Movie: "Movie",
  Formula1Car: "Formula1Car",
  UFCMMA: "UFCMMA",
  Trollface: "Trollface",
  DanceVideos: "DanceVideos",
  ModeClothes: "ModeClothes",
  Manga: "Manga",
  TopBoySnowfall: "TopBoySnowfall",
  HighImpactShatter: "HighImpactShatter",
} as const;
export type PromoterNiche = (typeof PromoterNiche)[keyof typeof PromoterNiche];

export const promoterNicheEtiket: Record<PromoterNiche, string> = {
  Anime: "Anime",
  Football: "Futbol",
  Movie: "Film",
  Formula1Car: "Formula 1 / Araba",
  UFCMMA: "UFC / MMA",
  Trollface: "Trollface",
  DanceVideos: "Dans Videoları",
  ModeClothes: "Moda / Giyim",
  Manga: "Manga",
  TopBoySnowfall: "Top Boy / Snowfall",
  HighImpactShatter: "High Impact / Shatter",
};

export const PromoterTier = {
  Low: "Low",
  Mid: "Mid",
  High: "High",
} as const;
export type PromoterTier = (typeof PromoterTier)[keyof typeof PromoterTier];

export const promoterTierEtiket: Record<PromoterTier, string> = {
  Low: "Low Tier",
  Mid: "Mid Tier",
  High: "High Tier",
};

export const promoterTierStyle: Record<
  PromoterTier,
  { bg: string; text: string; border: string; bar: string }
> = {
  Low: {
    bg: "var(--negative-soft)",
    text: "var(--negative)",
    border: "color-mix(in oklch, var(--negative) 35%, transparent)",
    bar: "var(--negative)",
  },
  Mid: {
    bg: "oklch(0.95 0.05 250)",
    text: "oklch(0.5 0.18 250)",
    border: "oklch(0.7 0.15 250 / 0.4)",
    bar: "oklch(0.55 0.18 250)",
  },
  High: {
    bg: "var(--positive-soft)",
    text: "var(--positive)",
    border: "color-mix(in oklch, var(--positive) 35%, transparent)",
    bar: "var(--positive)",
  },
};

// ============================================================
//  Müzik Profili — mağaza/platform
// ============================================================

export const MuzikMagaza = {
  YouTube: "YouTube",
  Spotify: "Spotify",
  AppleMusic: "AppleMusic",
  Deezer: "Deezer",
  AmazonMusic: "AmazonMusic",
  TikTok: "TikTok",
  Instagram: "Instagram",
  SoundCloud: "SoundCloud",
  Diger: "Diger",
} as const;
export type MuzikMagaza = (typeof MuzikMagaza)[keyof typeof MuzikMagaza];

export const muzikMagazaEtiket: Record<MuzikMagaza, string> = {
  YouTube: "YouTube",
  Spotify: "Spotify",
  AppleMusic: "Apple Music",
  Deezer: "Deezer",
  AmazonMusic: "Amazon Music",
  TikTok: "TikTok",
  Instagram: "Instagram",
  SoundCloud: "SoundCloud",
  Diger: "Diğer",
};

// ============================================================
//  Müzik Profili — harcama kategorisi (opsiyonel)
// ============================================================

export const MuzikHarcamaKategori = {
  Reklam: "Reklam",
  Tasarim: "Tasarim",
  Produksiyon: "Produksiyon",
  Klip: "Klip",
  Mix: "Mix",
  Master: "Master",
  Telif: "Telif",
  Diger: "Diger",
} as const;
export type MuzikHarcamaKategori =
  (typeof MuzikHarcamaKategori)[keyof typeof MuzikHarcamaKategori];

export const muzikHarcamaKategoriEtiket: Record<MuzikHarcamaKategori, string> = {
  Reklam: "Reklam / Promosyon",
  Tasarim: "Tasarım",
  Produksiyon: "Prodüksiyon",
  Klip: "Klip / Görsel",
  Mix: "Mix",
  Master: "Master",
  Telif: "Telif",
  Diger: "Diğer",
};
