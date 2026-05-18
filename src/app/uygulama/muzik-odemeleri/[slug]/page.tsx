import { notFound } from "next/navigation";
import { ModuleClosed } from "@/components/ui/module-closed";
import { isModuleActive } from "@/lib/module-guard";
import { getOrgId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { MuzikDetail } from "./muzik-detail";
import {
  listSanatcilarForSelect,
  listPromoterlarForSelect,
  listAktiveKasalarForSelect,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const orgId = await getOrgId().catch(() => null);
  if (!orgId) return { title: "Müzik Ödemesi" };
  const profil = await db.muzikProfil.findFirst({
    where: { organizationId: orgId, slug },
    select: { isim: true },
  });
  return { title: profil ? profil.isim : "Müzik Ödemesi" };
}

export default async function MuzikDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
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
  const { slug } = await params;

  const muzik = await db.muzikProfil.findFirst({
    where: { organizationId: orgId, slug },
    include: {
      sanatcilar: {
        include: {
          cari: { select: { id: true, kod: true, unvan: true } },
        },
      },
      gelirler: { orderBy: { tarih: "desc" } },
      harcamalar: {
        orderBy: { tarih: "desc" },
        include: {
          promoterCari: { select: { id: true, kod: true, unvan: true } },
          kasa: { select: { id: true, ad: true } },
        },
      },
      sanatciOdemeleri: {
        orderBy: { tarih: "desc" },
        include: {
          sanatciCari: { select: { id: true, kod: true, unvan: true } },
        },
      },
    },
  });
  if (!muzik) notFound();

  // Sahne adı > gerçek isim önceliği
  const sanatciAd = (c: { kod: string; unvan: string }) =>
    c.kod && c.kod !== c.unvan ? c.kod : c.unvan;

  // Selector listeleri (dialog'lar için)
  const [sanatcilar, promoterlar, kasalar] = await Promise.all([
    listSanatcilarForSelect(),
    listPromoterlarForSelect(),
    listAktiveKasalarForSelect(),
  ]);

  // Serialize Decimal → number (Server → Client boundary)
  const serialized = {
    id: muzik.id,
    slug: muzik.slug,
    isim: muzik.isim,
    isbirlikciler: muzik.isbirlikciler,
    magazalar: muzik.magazalar,
    notlar: muzik.notlar,
    olusturmaTarihi: muzik.olusturmaTarihi.toISOString().slice(0, 10),
    sanatcilar: muzik.sanatcilar.map((s) => ({
      id: s.cari.id,
      ad: sanatciAd(s.cari),
    })),
    gelirler: muzik.gelirler.map((g) => ({
      id: g.id,
      tarih: g.tarih.toISOString().slice(0, 10),
      platform: g.platform,
      tutar: Number(g.tutar),
      paraBirimi: g.paraBirimi,
      not: g.not,
    })),
    harcamalar: muzik.harcamalar.map((h) => ({
      id: h.id,
      tarih: h.tarih.toISOString().slice(0, 10),
      kategori: h.kategori,
      tutar: Number(h.tutar),
      paraBirimi: h.paraBirimi,
      not: h.not,
      borclaraYansit: h.borclaraYansit,
      promoter: h.promoterCari
        ? { id: h.promoterCari.id, ad: sanatciAd(h.promoterCari) }
        : null,
      kasa: h.kasa ? { id: h.kasa.id, ad: h.kasa.ad } : null,
    })),
    sanatciOdemeleri: muzik.sanatciOdemeleri.map((o) => ({
      id: o.id,
      tarih: o.tarih.toISOString().slice(0, 10),
      sanatci: { id: o.sanatciCari.id, ad: sanatciAd(o.sanatciCari) },
      tutar: Number(o.tutar),
      paraBirimi: o.paraBirimi,
      not: o.not,
      borclaraYansit: o.borclaraYansit,
    })),
  };

  const ozet = {
    toplamGelir: serialized.gelirler.reduce((s, g) => s + g.tutar, 0),
    toplamHarcama: serialized.harcamalar.reduce((s, h) => s + h.tutar, 0),
    toplamSanatciOdemesi: serialized.sanatciOdemeleri.reduce(
      (s, o) => s + o.tutar,
      0,
    ),
    sirketKar: 0,
  };
  ozet.sirketKar =
    ozet.toplamGelir - ozet.toplamHarcama - ozet.toplamSanatciOdemesi;

  return (
    <MuzikDetail
      profil={serialized}
      ozet={ozet}
      sanatcilar={sanatcilar.map((s) => ({ id: s.id, ad: s.unvan }))}
      promoterlar={promoterlar.map((p) => ({
        id: p.id,
        ad: p.unvan,
        fiyat: p.promoterPricePerVideo ? Number(p.promoterPricePerVideo) : null,
        tier: p.promoterTier,
      }))}
      kasalar={kasalar.map((k) => ({
        id: k.id,
        ad: k.ad,
        paraBirimi: k.paraBirimi,
        varsayilan: k.varsayilan,
      }))}
    />
  );
}
