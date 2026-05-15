/**
 * Muhasebe Pro — Türkçe lokal biçimlendirme yardımcıları.
 *
 * Tüm para, tarih, sayı biçimlendirmeleri TR-TR locale'i kullanır.
 * Tablolar `tabular-nums` ile hizalanır, biçimlendirme tutarlıdır.
 */

const TR = "tr-TR";

/* ============================================================
   Para
   ============================================================ */

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let f = currencyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(TR, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, f);
  }
  return f;
}

/**
 * Para biçimlendirme. `1234567.89` → `"1.234.567,89 ₺"`
 */
export function formatPara(
  miktar: number | bigint | null | undefined,
  currency: string = "TRY",
): string {
  if (miktar === null || miktar === undefined) return "—";
  return getCurrencyFormatter(currency).format(miktar);
}

/**
 * Sembolsüz tutar — tablolarda dikey hizalama için.
 * `1234.5` → `"1.234,50"`
 */
const numberFormat = new Intl.NumberFormat(TR, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTutar(
  miktar: number | bigint | null | undefined,
): string {
  if (miktar === null || miktar === undefined) return "—";
  return numberFormat.format(miktar);
}

/* ============================================================
   Tarih
   ============================================================ */

const dateLongFormat = new Intl.DateTimeFormat(TR, {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateShortFormat = new Intl.DateTimeFormat(TR, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat(TR, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `14 Mayıs 2026` */
export function formatTarihUzun(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateLongFormat.format(new Date(d));
}

/** `14.05.2026` */
export function formatTarih(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateShortFormat.format(new Date(d));
}

/** `14.05.2026 17:32` */
export function formatTarihSaat(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFormat.format(new Date(d));
}

/* ============================================================
   Vade / göreceli tarih
   ============================================================ */

export interface VadeBilgisi {
  metin: string;
  gunFarki: number;
  durum: "gecikti" | "bugun" | "yakin" | "uzak";
}

/**
 * Vade tarihinden günlük fark + okunabilir metin üretir.
 * Tasarımda renk seçimi için `durum` alanı kullanılır.
 *
 * - Bugün: `"Bugün vadesi"` / durum=`bugun`
 * - 3 gün sonra: `"3 gün kaldı"` / durum=`yakin` (≤7 gün), `uzak` (>7)
 * - 5 gün önce: `"5 gün gecikti"` / durum=`gecikti`
 */
export function formatVade(vade: Date | string): VadeBilgisi {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const v = new Date(vade);
  v.setHours(0, 0, 0, 0);
  const ms = v.getTime() - bugun.getTime();
  const g = Math.round(ms / 86_400_000);
  if (g === 0) return { metin: "Bugün vadesi", gunFarki: 0, durum: "bugun" };
  if (g < 0)
    return {
      metin: `${-g} gün gecikti`,
      gunFarki: g,
      durum: "gecikti",
    };
  return {
    metin: `${g} gün kaldı`,
    gunFarki: g,
    durum: g <= 7 ? "yakin" : "uzak",
  };
}

/* ============================================================
   Sayı + KDV
   ============================================================ */

/** KDV tutarını hesapla. Örn: `(100, 20)` → `20` */
export function hesaplaKdv(tutar: number, oran: number): number {
  return +(tutar * (oran / 100)).toFixed(2);
}

/** Toplamı hesapla. Örn: `(100, 20)` → `120` */
export function hesaplaToplam(tutar: number, oran: number): number {
  return +(tutar + hesaplaKdv(tutar, oran)).toFixed(2);
}

/* ============================================================
   Selamlama
   ============================================================ */

/** Saate göre selamlama metni */
export function selamlama(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}
