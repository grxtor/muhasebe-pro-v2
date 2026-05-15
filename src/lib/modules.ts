/**
 * Modül toggle sistemi — organization bazlı.
 *
 * Çekirdek modüller HER ZAMAN açık (Alacaklar/Borçlar/Profiller/Ayarlar).
 * Opsiyonel modüller şirket sahibi tarafından açılıp kapatılabilir.
 */

export type ModuleKey =
  | "faturalar"
  | "hareketler"
  | "urunler"
  | "tekrarlayanlar"
  | "hatirlaticilar"
  | "etiketler"
  | "cekSenet"
  | "kasa"
  | "kdvBeyan";

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  available?: boolean;
}

export const OPTIONAL_MODULES: ModuleConfig[] = [
  {
    key: "faturalar",
    label: "Faturalar",
    description: "Gönderilen ve gelen faturaların kaydı, KDV otomatik",
    href: "/uygulama/faturalar",
  },
  {
    key: "hareketler",
    label: "Hareketler",
    description: "Tahsilat ve ödemelerden oluşan zaman çizelgesi",
    href: "/uygulama/hareketler",
  },
  {
    key: "urunler",
    label: "Ürünler / Stok",
    description: "Ürün katalogu ve basit stok takibi (sadece mal satanlar için)",
    href: "/uygulama/urunler",
  },
  {
    key: "tekrarlayanlar",
    label: "Tekrarlayan Kayıtlar",
    description: "Kira, abonelik, maaş gibi düzenli ödemeler için şablon",
    href: "/uygulama/tekrarlayanlar",
  },
  {
    key: "hatirlaticilar",
    label: "Hatırlatıcılar",
    description: "Görev ve hatırlatma listesi",
    href: "/uygulama/hatirlaticilar",
  },
  {
    key: "etiketler",
    label: "Etiketler",
    description: "Profilleri renkli etiketlerle gruplama",
    href: "/uygulama/ayarlar/etiketler",
  },
  {
    key: "cekSenet",
    label: "Çek / Senet",
    description: "Alınan/verilen çek-senet takibi, vade ve durum yönetimi",
    href: "/uygulama/cek-senet",
  },
  {
    key: "kasa",
    label: "Kasa",
    description: "TL/USD/EUR kasaları, transferler, günlük bakiye",
    href: "/uygulama/kasa",
  },
  {
    key: "kdvBeyan",
    label: "KDV Beyan",
    description: "Aylık KDV özeti (faturalardan otomatik hesaplama)",
    href: "/uygulama/kdv-beyan",
  },
];

export interface ModuleFlags {
  faturalar: boolean;
  hareketler: boolean;
  urunler: boolean;
  tekrarlayanlar: boolean;
  hatirlaticilar: boolean;
  etiketler: boolean;
  cekSenet: boolean;
  kasa: boolean;
  kdvBeyan: boolean;
}

export const DEFAULT_MODULES: ModuleFlags = {
  faturalar: true,
  hareketler: true,
  urunler: false,
  tekrarlayanlar: true,
  hatirlaticilar: true,
  etiketler: true,
  cekSenet: false,
  kasa: false,
  kdvBeyan: false,
};

export function readModuleFlags(
  settings: Partial<{
    modulFaturalar: boolean;
    modulHareketler: boolean;
    modulUrunler: boolean;
    modulTekrarlayanlar: boolean;
    modulHatirlaticilar: boolean;
    modulEtiketler: boolean;
    modulCekSenet: boolean;
    modulKasa: boolean;
    modulKdvBeyan: boolean;
  }> | null,
): ModuleFlags {
  if (!settings) return DEFAULT_MODULES;
  return {
    faturalar: settings.modulFaturalar ?? DEFAULT_MODULES.faturalar,
    hareketler: settings.modulHareketler ?? DEFAULT_MODULES.hareketler,
    urunler: settings.modulUrunler ?? DEFAULT_MODULES.urunler,
    tekrarlayanlar:
      settings.modulTekrarlayanlar ?? DEFAULT_MODULES.tekrarlayanlar,
    hatirlaticilar:
      settings.modulHatirlaticilar ?? DEFAULT_MODULES.hatirlaticilar,
    etiketler: settings.modulEtiketler ?? DEFAULT_MODULES.etiketler,
    cekSenet: settings.modulCekSenet ?? DEFAULT_MODULES.cekSenet,
    kasa: settings.modulKasa ?? DEFAULT_MODULES.kasa,
    kdvBeyan: settings.modulKdvBeyan ?? DEFAULT_MODULES.kdvBeyan,
  };
}
