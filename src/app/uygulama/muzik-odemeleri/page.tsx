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
      gelirler: { select: { tutar: true, tarih: true } },
      harcamalar: { select: { tutar: true, tarih: true } },
      sanatciOdemeleri: { select: { tutar: true, tarih: true } },
    },
  });

  // Sahne adı > gerçek isim önceliği
  const sanatciAd = (c: { kod: string; unvan: string }) =>
    c.kod && c.kod !== c.unvan ? c.kod : c.unvan;

  /* Ay anahtarı: "YYYY-MM" */
  const ayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const rows = muzikler.map((m) => {
    const gelir = m.gelirler.reduce((s, g) => s + Number(g.tutar), 0);
    const harcama = m.harcamalar.reduce((s, h) => s + Number(h.tutar), 0);
    const sanatci = m.sanatciOdemeleri.reduce((s, o) => s + Number(o.tutar), 0);

    /* Ay bazlı kırılım — pivot için */
    const aylik: Record<
      string,
      { gelir: number; harcama: number; sanatci: number }
    > = {};
    const ekle = (
      tarih: Date,
      alan: "gelir" | "harcama" | "sanatci",
      tutar: number,
    ) => {
      const k = ayKey(new Date(tarih));
      if (!aylik[k]) aylik[k] = { gelir: 0, harcama: 0, sanatci: 0 };
      aylik[k][alan] += tutar;
    };
    for (const g of m.gelirler) ekle(g.tarih, "gelir", Number(g.tutar));
    for (const h of m.harcamalar) ekle(h.tarih, "harcama", Number(h.tutar));
    for (const o of m.sanatciOdemeleri)
      ekle(o.tarih, "sanatci", Number(o.tutar));

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
      aylik,
    };
  });

  return <MuzikList rows={rows} icon={<Music size={20} />} />;
}
