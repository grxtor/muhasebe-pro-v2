import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { readModuleFlags } from "@/lib/modules";
import { ModullerForm } from "./moduller-form";

export const metadata = { title: "Modüller" };
export const dynamic = "force-dynamic";

export default async function ModullerAyarlariPage() {
  const userId = await getUserId();
  const s = await db.userSettings.findUnique({ where: { userId } });
  const flags = readModuleFlags(s);

  // Kullanım istatistikleri — kullanıcı modülde data varsa uyaralım
  const [faturaSayisi, hareketSayisi, urunSayisi, tekrarSayisi, hatirSayisi] =
    await Promise.all([
      db.fatura.count({ where: { userId } }),
      db.hareket.count({ where: { userId } }),
      db.urun.count({ where: { userId } }),
      db.tekrarlayanKayit.count({ where: { userId } }),
      db.hatirlatici.count({ where: { userId } }),
    ]);

  return (
    <ModullerForm
      flags={flags}
      stats={{
        faturalar: faturaSayisi,
        hareketler: hareketSayisi,
        urunler: urunSayisi,
        tekrarlayanlar: tekrarSayisi,
        hatirlaticilar: hatirSayisi,
        etiketler: 0,
      }}
    />
  );
}
