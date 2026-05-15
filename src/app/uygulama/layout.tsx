import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readModuleFlags } from "@/lib/modules";
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

  const settings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
    select: {
      modulFaturalar: true,
      modulHareketler: true,
      modulUrunler: true,
      modulTekrarlayanlar: true,
      modulHatirlaticilar: true,
      modulEtiketler: true,
    },
  });
  const moduller = readModuleFlags(settings);

  return (
    <AppShell
      user={{
        name: session.user.name ?? "Kullanıcı",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      moduller={moduller}
    >
      {children}
    </AppShell>
  );
}
