import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { readModuleFlags } from "@/lib/modules";
import { ModullerForm } from "./moduller-form";

export const metadata = { title: "Modüller" };
export const dynamic = "force-dynamic";

export default async function ModullerAyarlariPage() {
  const orgId = await getOrgId();
  const org = await db.organization.findUnique({ where: { id: orgId } });
  const flags = readModuleFlags(org);

  // Kullanım istatistikleri (kapatılırken uyarı için)
  const [
    faturaSayisi,
    hareketSayisi,
    urunSayisi,
    tekrarSayisi,
    hatirSayisi,
    cekSenetSayisi,
    kasaSayisi,
  ] = await Promise.all([
    db.fatura.count({ where: { organizationId: orgId } }),
    db.hareket.count({ where: { organizationId: orgId } }),
    db.urun.count({ where: { organizationId: orgId } }),
    db.tekrarlayanKayit.count({ where: { organizationId: orgId } }),
    db.hatirlatici.count({ where: { organizationId: orgId } }),
    db.cekSenet.count({ where: { organizationId: orgId } }),
    db.kasa.count({ where: { organizationId: orgId } }),
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
        cekSenet: cekSenetSayisi,
        kasa: kasaSayisi,
        kdvBeyan: 0,
      }}
    />
  );
}
