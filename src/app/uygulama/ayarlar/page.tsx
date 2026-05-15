import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { ProfilForm } from "./profil-form";

export const metadata = { title: "Profil Ayarları" };
export const dynamic = "force-dynamic";

export default async function AyarlarProfilPage() {
  const userId = await getUserId();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      adSoyad: true,
      name: true,
      kayitTarihi: true,
      password: true,
    },
  });

  return (
    <ProfilForm
      initial={{
        email: user?.email ?? "",
        adSoyad: user?.adSoyad ?? user?.name ?? "",
        kayitTarihi: user?.kayitTarihi.toISOString() ?? "",
        hasPassword: !!user?.password,
      }}
    />
  );
}
