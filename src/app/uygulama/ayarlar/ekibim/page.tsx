import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { OrgRole } from "@/lib/org";
import { EkibimList } from "./ekibim-list";

export const metadata = { title: "Ekibim" };
export const dynamic = "force-dynamic";

export default async function EkibimPage() {
  const ctx = await getOrgContext();
  if (ctx.role !== OrgRole.Owner && ctx.role !== OrgRole.Admin) {
    redirect("/uygulama/ayarlar");
  }

  const [members, org, son30GunAudit, invitations] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            adSoyad: true,
            name: true,
            email: true,
            kayitTarihi: true,
          },
        },
      },
    }),
    db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { ad: true },
    }),
    db.auditLog.groupBy({
      by: ["userId"],
      where: {
        organizationId: ctx.orgId,
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _count: { id: true },
    }),
    db.invitation.findMany({
      where: {
        organizationId: ctx.orgId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const aktiviteMap = new Map<string, number>();
  for (const row of son30GunAudit) {
    aktiviteMap.set(row.userId, row._count.id);
  }

  // Davet URL'leri için origin türet
  const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";

  return (
    <EkibimList
      orgAd={org?.ad ?? ""}
      currentUserId={ctx.userId}
      currentRole={ctx.role}
      members={members.map((m) => ({
        id: m.id,
        userId: m.userId,
        adSoyad: m.user.adSoyad ?? m.user.name ?? null,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        sonAyAktivite: aktiviteMap.get(m.userId) ?? 0,
      }))}
      invitations={invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        url: baseUrl ? `${baseUrl}/davet/${i.token}` : `/davet/${i.token}`,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
