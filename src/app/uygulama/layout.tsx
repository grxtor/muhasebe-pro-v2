import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readModuleFlags } from "@/lib/modules";
import { ensureOrganization } from "@/lib/org";
import { AppShell } from "./_components/app-shell";

export default async function UygulamaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  // İlk girişte org otomatik oluşur + eski user-bazlı veriler taşınır
  const ctx = await ensureOrganization(session.user.id);

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      ad: true,
      modulFaturalar: true,
      modulHareketler: true,
      modulUrunler: true,
      modulTekrarlayanlar: true,
      modulHatirlaticilar: true,
      modulEtiketler: true,
    },
  });
  const moduller = readModuleFlags(org);

  return (
    <AppShell
      user={{
        name: session.user.name ?? "Kullanıcı",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      moduller={moduller}
      org={{
        id: ctx.orgId,
        ad: org?.ad ?? ctx.orgAd,
        role: ctx.role,
      }}
    >
      {children}
    </AppShell>
  );
}
