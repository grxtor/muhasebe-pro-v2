import { Music } from "lucide-react";
import { ModuleClosed } from "@/components/ui/module-closed";
import { isModuleActive } from "@/lib/module-guard";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { MuzikList } from "./muzik-list";

export const metadata = {
  title: "Müzik Ödemeleri",
};

export const dynamic = "force-dynamic";

export default async function MuzikOdemeleriPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await isModuleActive("muzik"))) {
    return (
      <ModuleClosed
        modulAd="Müzik Ödemeleri"
        aciklama="Ayarlar > Modüller'den açabilirsin."
      />
    );
  }

  const orgId = await getOrgId();
  const { q = "" } = await searchParams;

  const muzikler = await db.muzikProfil.findMany({
    where: {
      organizationId: orgId,
      aktif: true,
      ...(q
        ? {
            OR: [
              { isim: { contains: q, mode: "insensitive" } },
              {
                sanatcilar: {
                  some: {
                    cari: {
                      OR: [
                        { kod: { contains: q, mode: "insensitive" } },
                        { unvan: { contains: q, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { olusturmaTarihi: "desc" },
    include: {
      sanatcilar: {
        include: { cari: { select: { id: true, kod: true, unvan: true } } },
      },
      gelirler: { select: { tutar: true } },
      harcamalar: { select: { tutar: true } },
      sanatciOdemeleri: { select: { tutar: true } },
    },
  });

  // Sahne adı > gerçek isim önceliği
  const sanatciAd = (c: { kod: string; unvan: string }) =>
    c.kod && c.kod !== c.unvan ? c.kod : c.unvan;

  const rows = muzikler.map((m) => {
    const gelir = m.gelirler.reduce((s, g) => s + Number(g.tutar), 0);
    const harcama = m.harcamalar.reduce((s, h) => s + Number(h.tutar), 0);
    const sanatci = m.sanatciOdemeleri.reduce((s, o) => s + Number(o.tutar), 0);
    return {
      profil: {
        id: m.id,
        slug: m.slug,
        isim: m.isim,
        sanatcilar: m.sanatcilar.map((s) => ({
          id: s.cari.id,
          ad: sanatciAd(s.cari),
        })),
        magazalar: m.magazalar,
      },
      ozet: {
        toplamGelir: gelir,
        toplamHarcama: harcama,
        toplamSanatciOdemesi: sanatci,
        sirketKar: gelir - harcama - sanatci,
      },
    };
  });

  return <MuzikList rows={rows} icon={<Music size={20} />} />;
}
