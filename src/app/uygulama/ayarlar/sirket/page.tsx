import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { SirketForm } from "./sirket-form";

export const metadata = { title: "Şirket Bilgileri" };
export const dynamic = "force-dynamic";

export default async function SirketAyarlariPage() {
  const userId = await getUserId();
  const sirket = await db.sirketBilgisi.findUnique({ where: { userId } });
  return (
    <SirketForm
      initial={{
        sirketAdi: sirket?.sirketAdi ?? "",
        vergiNo: sirket?.vergiNo ?? "",
        vergiDairesi: sirket?.vergiDairesi ?? "",
        tcKimlikNo: sirket?.tcKimlikNo ?? "",
        adres: sirket?.adres ?? "",
        sehir: sirket?.sehir ?? "",
        ulke: sirket?.ulke ?? "Türkiye",
        telefon: sirket?.telefon ?? "",
        email: sirket?.email ?? "",
        website: sirket?.website ?? "",
        iban: sirket?.iban ?? "",
        bankaAdi: sirket?.bankaAdi ?? "",
        logoUrl: sirket?.logoUrl ?? "",
      }}
    />
  );
}
