import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { SirketForm } from "./sirket-form";
import { LogoUpload } from "./logo-upload";

export const metadata = { title: "Şirket Bilgileri" };
export const dynamic = "force-dynamic";

export default async function SirketAyarlariPage() {
  const orgId = await getOrgId();
  const org = await db.organization.findUnique({ where: { id: orgId } });
  return (
    <div className="space-y-6">
      <LogoUpload currentUrl={org?.logoUrl ?? null} />
      <SirketForm
        initial={{
          ad: org?.ad ?? "",
          sirketAdi: org?.sirketAdi ?? "",
          vergiNo: org?.vergiNo ?? "",
          vergiDairesi: org?.vergiDairesi ?? "",
          tcKimlikNo: org?.tcKimlikNo ?? "",
          adres: org?.adres ?? "",
          sehir: org?.sehir ?? "",
          ulke: org?.ulke ?? "Türkiye",
          telefon: org?.telefon ?? "",
          email: org?.email ?? "",
          website: org?.website ?? "",
          iban: org?.iban ?? "",
          bankaAdi: org?.bankaAdi ?? "",
          logoUrl: org?.logoUrl ?? "",
        }}
      />
    </div>
  );
}
