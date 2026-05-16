import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { parseAvansDetay } from "../_lib/harcama-detay";
import { AvansList, type AvansRow, type CariRef } from "./avans-list";

export const metadata = { title: "Avans" };
export const dynamic = "force-dynamic";

const HAFTA_MS = 7 * 86_400_000;

export default async function AvansPage() {
  if (!(await isModuleActive("avans"))) {
    return <ModuleClosed modulAd="Avans" />;
  }

  const orgId = await getOrgId();

  const [kayitlar, profiller] = await Promise.all([
    db.odemeNotu.findMany({
      where: {
        organizationId: orgId,
        cari: { tip: "Harcama", harcamaTuru: "Avans" },
      },
      include: {
        cari: { select: { id: true, kod: true, unvan: true } },
      },
      orderBy: { olusturmaTarihi: "desc" },
    }),
    db.cari.findMany({
      where: {
        organizationId: orgId,
        aktif: true,
        tip: "Harcama",
        harcamaTuru: "Avans",
      },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
  ]);

  const now = Date.now();

  const rows: AvansRow[] = kayitlar.map((k) => {
    const tutar = Number(k.tutar);
    const detay = parseAvansDetay(k.detay);
    const vadeIso = detay.geriOdemeTarihi ?? k.vadeTarihi.toISOString();
    const vadeTs = new Date(vadeIso).getTime();
    const gecikti = !detay.geriOdendi && vadeTs < now;
    const yaklasiyor =
      !detay.geriOdendi && !gecikti && vadeTs - now < HAFTA_MS;
    return {
      id: k.id,
      cariId: k.cariId,
      baslik: k.baslik,
      aciklama: k.aciklama,
      paraBirimi: k.paraBirimi,
      tutar,
      geriOdemeTarihi: vadeIso,
      geriOdendi: detay.geriOdendi,
      geriOdenenTutar: detay.geriOdenenTutar ?? 0,
      gecikti,
      yaklasiyor,
      olusturmaTarihi: k.olusturmaTarihi.toISOString(),
      cari: k.cari!,
    };
  });

  const toplamAvansVerilen = rows.reduce((s, r) => s + r.tutar, 0);
  const toplamGeriAlinan = rows
    .filter((r) => r.geriOdendi)
    .reduce((s, r) => s + r.geriOdenenTutar, 0);
  const toplamBekleyen = rows
    .filter((r) => !r.geriOdendi)
    .reduce((s, r) => s + r.tutar, 0);
  const gecikenSayisi = rows.filter((r) => r.gecikti).length;
  const yaklasanSayisi = rows.filter((r) => r.yaklasiyor).length;

  return (
    <AvansList
      items={rows}
      cariler={profiller as CariRef[]}
      ozet={{
        toplamAvansVerilen,
        toplamGeriAlinan,
        toplamBekleyen,
        gecikenSayisi,
        yaklasanSayisi,
      }}
    />
  );
}
