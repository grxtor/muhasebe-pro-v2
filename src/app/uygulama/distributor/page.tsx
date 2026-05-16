import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { DistributorList, type DistributorRow } from "./distributor-list";

export const metadata = { title: "Distribütör Raporları" };
export const dynamic = "force-dynamic";

interface SearchParams {
  yeni?: string;
}

export default async function DistributorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isModuleActive("distributor"))) {
    return <ModuleClosed modulAd="Distribütör Rapor" />;
  }

  const orgId = await getOrgId();
  const sp = await searchParams;
  const autoOpenYeni = sp.yeni === "1";

  const raporlar = await db.distributorRapor.findMany({
    where: { organizationId: orgId },
    orderBy: { olusturmaTarihi: "desc" },
    take: 50,
    select: {
      id: true,
      ad: true,
      platform: true,
      donem: true,
      dosyaAdi: true,
      toplamGelir: true,
      paraBirimi: true,
      toplamStream: true,
      satirSayisi: true,
      olusturmaTarihi: true,
    },
  });

  const items: DistributorRow[] = raporlar.map((r) => ({
    id: r.id,
    ad: r.ad,
    platform: r.platform,
    donem: r.donem,
    dosyaAdi: r.dosyaAdi,
    toplamGelir: r.toplamGelir.toString(),
    paraBirimi: r.paraBirimi,
    toplamStream: r.toplamStream,
    satirSayisi: r.satirSayisi,
    olusturmaTarihi: r.olusturmaTarihi.toISOString(),
  }));

  // İstatistikler
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const buAyDonem = `${yyyy}-${mm}`;

  let toplamGelir = 0;
  let buAyGelir = 0;
  for (const r of raporlar) {
    const g = Number(r.toplamGelir);
    toplamGelir += g;
    if (r.donem === buAyDonem) buAyGelir += g;
  }

  return (
    <DistributorList
      items={items}
      autoOpenYeni={autoOpenYeni}
      istatistikler={{
        toplamRapor: raporlar.length,
        toplamGelir: toplamGelir.toFixed(2),
        buAyGelir: buAyGelir.toFixed(2),
      }}
    />
  );
}
