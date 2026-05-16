/**
 * Harcama profilleri (Ticaret/Avans) için OdemeNotu.detay JSON parse helper'ları.
 *
 * Şema (Prisma comment'inden):
 *   Ticaret: { yatirim: number, getiri: number }
 *   Avans:   { geriOdemeTarihi: string, geriOdendi: boolean, geriOdenenTutar?: number }
 *
 * Yatırım miktarı OdemeNotu.tutar üzerinden okunur — detay sadece ek alanı tutar.
 */

export interface TicaretDetay {
  getiri: number;
}

export interface AvansDetay {
  geriOdemeTarihi?: string;
  geriOdendi: boolean;
  geriOdenenTutar?: number;
}

export function parseTicaretDetay(detay: unknown): TicaretDetay {
  if (typeof detay !== "object" || !detay) return { getiri: 0 };
  const d = detay as Record<string, unknown>;
  return { getiri: typeof d.getiri === "number" ? d.getiri : 0 };
}

export function parseAvansDetay(detay: unknown): AvansDetay {
  if (typeof detay !== "object" || !detay) return { geriOdendi: false };
  const d = detay as Record<string, unknown>;
  return {
    geriOdemeTarihi:
      typeof d.geriOdemeTarihi === "string" ? d.geriOdemeTarihi : undefined,
    geriOdendi: typeof d.geriOdendi === "boolean" ? d.geriOdendi : false,
    geriOdenenTutar:
      typeof d.geriOdenenTutar === "number" ? d.geriOdenenTutar : undefined,
  };
}
