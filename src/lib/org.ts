/**
 * Organization (multi-tenant) helper'ları.
 *
 * - ensureOrganization: kullanıcı login olunca current org'unu döner.
 *   Yoksa otomatik "solo org" oluşturur + eski verilerini migrate eder.
 * - getOrgContext: oturumda aktif org + üyelik bilgisi.
 * - requireRole: rol gerektiren server actions için guard.
 */

import { db } from "./db";
import { OrgRole } from "@prisma/client";

export { OrgRole };

const ROLE_LEVEL: Record<OrgRole, number> = {
  Goruntuleyici: 1,
  Muhasebeci: 2,
  Admin: 3,
  Owner: 4,
};

export function hasMinRole(actual: OrgRole, required: OrgRole): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "org";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {
    i++;
    slug = `${base}-${i}`;
  }
  return slug;
}

/**
 * Kullanıcı için aktif organizasyon döner.
 * - currentOrgId varsa: o org'u dön (üyeliğini doğrula)
 * - Yoksa: ilk üye olduğu org'u currentOrgId yap
 * - Hiç üye değilse: "Solo Org" oluştur + tüm eski user-bazlı veriyi
 *   migrate et (organizationId'lerini set et)
 *
 * Concurrent-safe: aynı kullanıcı için paralel çağrılar slug çakışmasına
 * neden olursa retry yapar.
 */
export async function ensureOrganization(userId: string): Promise<{
  orgId: string;
  role: OrgRole;
  orgAd: string;
}> {
  return ensureOrganizationInternal(userId, 0);
}

async function ensureOrganizationInternal(
  userId: string,
  attempt: number,
): Promise<{ orgId: string; role: OrgRole; orgAd: string }> {
  // 1. Üyelikleri çek
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    include: {
      organization: { select: { id: true, ad: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  // 2. Hiç üye değilse — yeni org oluştur (lazy migration)
  if (memberships.length === 0) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { adSoyad: true, name: true, email: true, sirketAdi: true },
    });
    const isim =
      user?.sirketAdi ??
      user?.adSoyad ??
      user?.name ??
      user?.email?.split("@")[0] ??
      "Şirketim";
    const orgAd = user?.sirketAdi ?? `${isim} Şirketi`;
    const slug = await uniqueSlug(slugify(orgAd));

    // Eski SirketBilgisi varsa onun değerlerini yeni Org'a kopyala
    const eskiSirket = await db.sirketBilgisi.findUnique({
      where: { userId },
    });
    // Eski UserSettings varsa modül toggle'larını al
    const eskiSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    let org: { id: string; ad: string };
    try {
      org = await db.organization.create({
        data: {
          ad: orgAd,
          slug,
          ownerId: userId,
        sirketAdi: eskiSirket?.sirketAdi ?? user?.sirketAdi ?? null,
        vergiNo: eskiSirket?.vergiNo ?? null,
        vergiDairesi: eskiSirket?.vergiDairesi ?? null,
        tcKimlikNo: eskiSirket?.tcKimlikNo ?? null,
        adres: eskiSirket?.adres ?? null,
        sehir: eskiSirket?.sehir ?? null,
        ulke: eskiSirket?.ulke ?? "Türkiye",
        telefon: eskiSirket?.telefon ?? null,
        email: eskiSirket?.email ?? user?.email ?? null,
        website: eskiSirket?.website ?? null,
        iban: eskiSirket?.iban ?? null,
        bankaAdi: eskiSirket?.bankaAdi ?? null,
        logoUrl: eskiSirket?.logoUrl ?? null,
        modulFaturalar: eskiSettings?.modulFaturalar ?? true,
        modulHareketler: eskiSettings?.modulHareketler ?? true,
        modulUrunler: eskiSettings?.modulUrunler ?? false,
        modulTekrarlayanlar: eskiSettings?.modulTekrarlayanlar ?? true,
        modulHatirlaticilar: eskiSettings?.modulHatirlaticilar ?? true,
        modulEtiketler: eskiSettings?.modulEtiketler ?? true,
          defaultKdvOrani: eskiSettings?.defaultKdvOrani ?? 20,
          defaultParaBirimi: eskiSettings?.defaultParaBirimi ?? "TRY",
          defaultVadeGun: eskiSettings?.defaultVadeGun ?? 30,
        },
        select: { id: true, ad: true },
      });
    } catch (err) {
      // Concurrent çağrı: paralel istek aynı org'u oluşturdu mu? Yeniden dene.
      if (
        (err as { code?: string }).code === "P2002" &&
        attempt < 3
      ) {
        // Kısa bir bekleme + retry
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
        return ensureOrganizationInternal(userId, attempt + 1);
      }
      throw err;
    }

    // Owner olarak ekle (idempotent — race condition'da unique conflict ignore)
    try {
      await db.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: OrgRole.Owner,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }

    // Eski user-bazlı verileri yeni org'a bağla (lazy migration)
    await migrateUserDataToOrg(userId, org.id);

    await db.user.update({
      where: { id: userId },
      data: { currentOrgId: org.id },
    });

    return { orgId: org.id, role: OrgRole.Owner, orgAd: org.ad };
  }

  // 3. Üye ise — currentOrgId'yi kullan, yoksa ilk üyeliği
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentOrgId: true },
  });

  const targetOrgId = user?.currentOrgId ?? memberships[0].organizationId;
  const membership = memberships.find((m) => m.organizationId === targetOrgId);
  if (!membership) {
    // currentOrgId artık geçerli değilse ilk üyeliğe geç
    const first = memberships[0];
    await db.user.update({
      where: { id: userId },
      data: { currentOrgId: first.organizationId },
    });
    return {
      orgId: first.organizationId,
      role: first.role,
      orgAd: first.organization.ad,
    };
  }

  if (user?.currentOrgId !== membership.organizationId) {
    await db.user.update({
      where: { id: userId },
      data: { currentOrgId: membership.organizationId },
    });
  }

  return {
    orgId: membership.organizationId,
    role: membership.role,
    orgAd: membership.organization.ad,
  };
}

/**
 * Eski user-bazlı domain kayıtlarını verilen org'a bağlar.
 * Sadece organizationId'si null olanlar için çalışır (idempotent).
 */
async function migrateUserDataToOrg(userId: string, orgId: string) {
  // Tablolar — sırayla updateMany
  const tables = [
    "cari",
    "hareket",
    "odemeNotu",
    "fatura",
    "dekont",
    "tag",
    "hatirlatici",
    "tekrarlayanKayit",
    "urun",
    "stokHareketi",
    "auditLog",
  ] as const;

  for (const table of tables) {
    // Prisma tipleri varyantlı; runtime'da güvenle çağır
    // @ts-expect-error: dynamic model access
    await db[table].updateMany({
      where: { userId, organizationId: null },
      data: { organizationId: orgId },
    });
  }
}
