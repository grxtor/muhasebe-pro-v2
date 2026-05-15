import { Settings as SettingsIcon } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { AyarlarNav } from "./_nav";

export default async function AyarlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();
  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    select: { ad: true },
  });
  const roleEtiket: Record<string, string> = {
    Owner: "Sahip",
    Admin: "Yönetici",
    Muhasebeci: "Muhasebeci",
    Goruntuleyici: "Görüntüleyici",
  };
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={<SettingsIcon size={20} />}
        title="Ayarlar"
        subtitle={`${org?.ad ?? "Şirket"} · ${roleEtiket[ctx.role] ?? ctx.role}`}
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <AyarlarNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
