import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { TekrarlayanList } from "./tekrarlayan-list";

export const metadata = { title: "Tekrarlayan Kayıtlar" };
export const dynamic = "force-dynamic";

export default async function TekrarlayanlarPage() {
  if (!(await isModuleActive("tekrarlayanlar"))) {
    return <ModuleClosed modulAd="Tekrarlayan Kayıtlar" />;
  }
  const orgId = await getOrgId();
  const [items, cariler] = await Promise.all([
    db.tekrarlayanKayit.findMany({
      where: { organizationId: orgId },
      orderBy: [{ aktif: "desc" }, { sonrakiTarih: "asc" }],
      include: { cari: { select: { id: true, kod: true, unvan: true } } },
    }),
    db.cari.findMany({
      where: { organizationId: orgId, aktif: true },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
  ]);

  return (
    <TekrarlayanList
      items={items.map((t) => ({
        id: t.id,
        ad: t.ad,
        tip: t.tip,
        cariId: t.cariId,
        yon: t.yon,
        tutar: t.tutar.toString(),
        kdvOrani: t.kdvOrani.toString(),
        paraBirimi: t.paraBirimi,
        aciklama: t.aciklama,
        vadeGun: t.vadeGun,
        siklik: t.siklik,
        baslangicTarihi: t.baslangicTarihi.toISOString(),
        sonrakiTarih: t.sonrakiTarih.toISOString(),
        bitisTarihi: t.bitisTarihi?.toISOString() ?? null,
        uretilenAdet: t.uretilenAdet,
        aktif: t.aktif,
        cari: t.cari,
      }))}
      cariler={cariler}
    />
  );
}
