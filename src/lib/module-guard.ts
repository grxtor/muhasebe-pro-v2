import { db } from "./db";
import { getOrgId } from "./auth-helpers";
import { readModuleFlags, type ModuleKey } from "./modules";

/**
 * Aktif organizasyonda bir modülün açık olup olmadığını döner.
 */
export async function isModuleActive(key: ModuleKey): Promise<boolean> {
  const orgId = await getOrgId();
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      modulFaturalar: true,
      modulHareketler: true,
      modulUrunler: true,
      modulTekrarlayanlar: true,
      modulHatirlaticilar: true,
      modulEtiketler: true,
      modulCekSenet: true,
      modulKasa: true,
      modulKdvBeyan: true,
      modulDistributor: true,
      modulTicaret: true,
      modulAvans: true,
      modulMuzik: true,
    },
  });
  const flags = readModuleFlags(org);
  return flags[key];
}
