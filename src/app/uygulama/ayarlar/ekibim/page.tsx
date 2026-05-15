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

  const [members, org, son30GunAudit] = await Promise.all([
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
    // Üye bazında son 30 gün aktivite sayısı
    db.auditLog.groupBy({
      by: ["userId"],
      where: {
        organizationId: ctx.orgId,
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _count: { id: true },
    }),
  ]);

  const aktiviteMap = new Map<string, number>();
  for (const row of son30GunAudit) {
    aktiviteMap.set(row.userId, row._count.id);
  }

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
    />
  );
}
