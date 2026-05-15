import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "./_components/app-shell";

export default async function UygulamaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }
  return (
    <AppShell
      user={{
        name: session.user.name ?? "Kullanıcı",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
