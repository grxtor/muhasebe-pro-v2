import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { UrunList } from "./urun-list";
import { nextUrunKodu } from "./actions";

export const metadata = { title: "Ürünler / Stok" };
export const dynamic = "force-dynamic";

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; durum?: string }>;
}) {
  if (!(await isModuleActive("urunler"))) {
    return <ModuleClosed modulAd="Ürünler / Stok" />;
  }
  const orgId = await getOrgId();
  const { q = "", kategori = "", durum = "" } = await searchParams;

  const where = {
    organizationId: orgId,
    ...(kategori ? { kategori } : {}),
    ...(durum === "azalan"
      ? { stok: { lte: db.urun.fields.minStok } }
      : durum === "aktif"
      ? { aktif: true }
      : durum === "pasif"
      ? { aktif: false }
      : {}),
    ...(q
      ? {
          OR: [
            { ad: { contains: q, mode: "insensitive" as const } },
            { kod: { contains: q, mode: "insensitive" as const } },
            { barkod: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, kategoriler, stats, sonrakiKod] = await Promise.all([
    db.urun.findMany({ where, orderBy: { ad: "asc" } }),
    db.urun.findMany({
      where: { organizationId: orgId, kategori: { not: null } },
      select: { kategori: true },
      distinct: ["kategori"],
    }),
    computeStats(orgId),
    nextUrunKodu(),
  ]);

  return (
    <UrunList
      items={items.map((u) => ({
        id: u.id,
        kod: u.kod,
        ad: u.ad,
        aciklama: u.aciklama,
        birim: u.birim,
        satisFiyati: u.satisFiyati.toString(),
        alisFiyati: u.alisFiyati?.toString() ?? null,
        kdvOrani: u.kdvOrani.toString(),
        paraBirimi: u.paraBirimi,
        stok: u.stok.toString(),
        minStok: u.minStok.toString(),
        kategori: u.kategori,
        barkod: u.barkod,
        aktif: u.aktif,
      }))}
      kategoriler={kategoriler
        .map((k) => k.kategori)
        .filter((k): k is string => !!k)}
      stats={stats}
      sonrakiKod={sonrakiKod}
    />
  );
}

async function computeStats(orgId: string) {
  const [toplamUrun, dusukStok, toplamDeger] = await Promise.all([
    db.urun.count({ where: { organizationId: orgId, aktif: true } }),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "Urun"
      WHERE "organizationId" = ${orgId}
        AND "aktif" = true
        AND "stok" <= "minStok"
    `,
    db.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM("stok" * "satisFiyati"), 0)::float8 as total
      FROM "Urun"
      WHERE "organizationId" = ${orgId} AND "aktif" = true
    `,
  ]);

  return {
    toplamUrun,
    dusukStok: Number(dusukStok[0]?.count ?? 0),
    toplamDeger: toplamDeger[0]?.total ?? 0,
  };
}
