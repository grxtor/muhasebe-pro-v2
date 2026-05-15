import { db } from "./db";
import { getUserId } from "./auth-helpers";
import { readModuleFlags, type ModuleKey } from "./modules";

/**
 * Bir modülün aktif olup olmadığını döner. Sayfanın en üstünde
 * çağrılır; false dönüyorsa sayfa "modül kapalı" bilgisi gösterir.
 */
export async function isModuleActive(key: ModuleKey): Promise<boolean> {
  const userId = await getUserId();
  const s = await db.userSettings.findUnique({
    where: { userId },
    select: {
      modulFaturalar: true,
      modulHareketler: true,
      modulUrunler: true,
      modulTekrarlayanlar: true,
      modulHatirlaticilar: true,
      modulEtiketler: true,
    },
  });
  const flags = readModuleFlags(s);
  return flags[key];
}
