import { auth } from "@/auth";
import { db } from "./db";
import { ensureOrganization, hasMinRole, OrgRole } from "./org";

/**
 * Server-side aktif kullanıcının id'sini döner.
 * Yoksa hata fırlatır.
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Yetkisiz erişim");
  }
  return session.user.id;
}

/**
 * Aktif organizasyon + rol döner (lazy migration ile garanti var).
 *
 * Tipik kullanım: domain query'lerinde `where: { organizationId }` filtresi
 * için orgId'yi buradan alın.
 */
export async function getOrgContext(): Promise<{
  userId: string;
  orgId: string;
  role: OrgRole;
}> {
  const userId = await getUserId();
  const { orgId, role } = await ensureOrganization(userId);
  return { userId, orgId, role };
}

/**
 * Sadece aktif org id'sini döner — küçük query'lerde kısa yol.
 */
export async function getOrgId(): Promise<string> {
  const { orgId } = await getOrgContext();
  return orgId;
}

/**
 * Belirli bir rolün altında ise hata fırlatır.
 * Kullanım: const ctx = await requireRole(OrgRole.Admin);
 */
export async function requireRole(min: OrgRole): Promise<{
  userId: string;
  orgId: string;
  role: OrgRole;
}> {
  const ctx = await getOrgContext();
  if (!hasMinRole(ctx.role, min)) {
    throw new Error(`Bu işlem için ${min} rolü gerekir`);
  }
  return ctx;
}

/**
 * İsteğe bağlı session getirici — yoksa null döner, hata atmaz.
 */
export async function getCurrentSession() {
  return auth();
}
