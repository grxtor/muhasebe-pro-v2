import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { GorunumForm } from "./gorunum-form";

export const metadata = { title: "Görünüm Ayarları" };
export const dynamic = "force-dynamic";

export default async function GorunumAyarlariPage() {
  const userId = await getUserId();
  const settings = await db.userSettings.findUnique({ where: { userId } });
  return (
    <GorunumForm
      initial={{
        tema: settings?.tema ?? "system",
        yogunluk: settings?.yogunluk ?? "comfortable",
      }}
    />
  );
}
