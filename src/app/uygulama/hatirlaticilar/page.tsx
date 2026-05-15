import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { HatirlaticiList } from "./hatirlatici-list";

export const metadata = { title: "Hatırlatıcılar" };
export const dynamic = "force-dynamic";

export default async function HatirlaticilarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!(await isModuleActive("hatirlaticilar"))) {
    return <ModuleClosed modulAd="Hatırlatıcılar" />;
  }
  const orgId = await getOrgId();
  const { tab = "acik" } = await searchParams;

  const where =
    tab === "tamamlandi"
      ? { organizationId: orgId, tamamlandi: true }
      : { organizationId: orgId, tamamlandi: false };

  const [items, cariler, sayilar] = await Promise.all([
    db.hatirlatici.findMany({
      where,
      orderBy: { hatirlatmaTarihi: "asc" },
      include: { cari: { select: { id: true, kod: true, unvan: true } } },
    }),
    db.cari.findMany({
      where: { organizationId: orgId, aktif: true },
      orderBy: { unvan: "asc" },
      select: { id: true, kod: true, unvan: true },
    }),
    Promise.all([
      db.hatirlatici.count({
        where: { organizationId: orgId, tamamlandi: false },
      }),
      db.hatirlatici.count({
        where: { organizationId: orgId, tamamlandi: true },
      }),
    ]),
  ]);

  return (
    <HatirlaticiList
      currentTab={tab}
      items={items.map((h) => ({
        id: h.id,
        baslik: h.baslik,
        aciklama: h.aciklama,
        hatirlatmaTarihi: h.hatirlatmaTarihi.toISOString(),
        tamamlandi: h.tamamlandi,
        oncelik: h.oncelik,
        cari: h.cari,
      }))}
      cariler={cariler}
      sayilar={{ acik: sayilar[0], tamamlandi: sayilar[1] }}
    />
  );
}
