import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { BildirimForm } from "./bildirim-form";

export const metadata = { title: "Bildirim Ayarları" };
export const dynamic = "force-dynamic";

export default async function BildirimAyarlariPage() {
  const userId = await getUserId();
  const s = await db.userSettings.findUnique({ where: { userId } });
  return (
    <BildirimForm
      initial={{
        emailBildirim: s?.emailBildirim ?? true,
        pushBildirim: s?.pushBildirim ?? false,
        vadeUyariGun: s?.vadeUyariGun ?? 3,
        defaultKdvOrani: Number(s?.defaultKdvOrani ?? 20),
        defaultParaBirimi: s?.defaultParaBirimi ?? "TRY",
        defaultVadeGun: s?.defaultVadeGun ?? 30,
      }}
    />
  );
}
