/**
 * Modül toggle sistemi — kullanıcı bazlı.
 *
 * Çekirdek modüller HER ZAMAN açık (Alacaklar/Borçlar/Profiller/Ayarlar).
 * Opsiyonel modüller kullanıcı tarafından açılıp kapatılabilir.
 */

export type ModuleKey =
  | "faturalar"
  | "hareketler"
  | "urunler"
  | "tekrarlayanlar"
  | "hatirlaticilar"
  | "etiketler";

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  // Eğer false ise tamamen kaldırılır (örn: deneysel modüller)
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
];

export interface ModuleFlags {
  faturalar: boolean;
  hareketler: boolean;
  urunler: boolean;
  tekrarlayanlar: boolean;
  hatirlaticilar: boolean;
  etiketler: boolean;
}

export const DEFAULT_MODULES: ModuleFlags = {
  faturalar: true,
  hareketler: true,
  urunler: false,
  tekrarlayanlar: true,
  hatirlaticilar: true,
  etiketler: true,
};

/**
 * Prisma UserSettings'i ModuleFlags'e çevirir, eksik alanlar default'tan beslenir.
 */
export function readModuleFlags(
  settings: Partial<{
    modulFaturalar: boolean;
    modulHareketler: boolean;
    modulUrunler: boolean;
    modulTekrarlayanlar: boolean;
    modulHatirlaticilar: boolean;
    modulEtiketler: boolean;
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
  };
}
