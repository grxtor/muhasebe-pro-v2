import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { parseTicaretDetay } from "../_lib/harcama-detay";
import { TicaretList, type TicaretRow, type CariRef } from "./ticaret-list";

export const metadata = { title: "Ticaret" };
export const dynamic = "force-dynamic";

export default async function TicaretPage() {
  if (!(await isModuleActive("ticaret"))) {
    return <ModuleClosed modulAd="Ticaret" />;
  }

  const orgId = await getOrgId();

  const [kayitlar, profiller] = await Promise.all([
    db.odemeNotu.findMany({
      where: {
        organizationId: orgId,
        cari: { tip: "Harcama", harcamaTuru: "Ticaret" },
      },
      include: {
        cari: { select: { id: true, kod: true, unvan: true } },
      },
      orderBy: { olusturmaTarihi: "desc" }, // istek üzerine, oluşma sırası
    }),
    db.cari.findMany({
      where: {
        organizationId: orgId,
        aktif: true,
        tip: "Harcama",
        harcamaTuru: "Ticaret",
      },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
  ]);

  const rows: TicaretRow[] = kayitlar.map((k) => {
    const yatirim = Number(k.tutar);
    const { getiri } = parseTicaretDetay(k.detay);
    const kar = getiri - yatirim;
    const karYuzdesi = yatirim > 0 ? (kar / yatirim) * 100 : 0;
    return {
      id: k.id,
      cariId: k.cariId,
      baslik: k.baslik,
      aciklama: k.aciklama,
      paraBirimi: k.paraBirimi,
      yatirim,
      getiri,
      kar,
      karYuzdesi,
      olusturmaTarihi: k.olusturmaTarihi.toISOString(),
      cari: k.cari!,
    };
  });

  const toplamYatirim = rows.reduce((s, r) => s + r.yatirim, 0);
  const toplamGetiri = rows.reduce((s, r) => s + r.getiri, 0);
  const netKar = toplamGetiri - toplamYatirim;
  const ortalamaKarYuzdesi =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.karYuzdesi, 0) / rows.length
      : 0;

  const cariler: CariRef[] = profiller;

  return (
    <TicaretList
      items={rows}
      cariler={cariler}
      ozet={{
        toplamYatirim,
        toplamGetiri,
        netKar,
        ortalamaKarYuzdesi,
        kayitSayisi: rows.length,
      }}
    />
  );
}
