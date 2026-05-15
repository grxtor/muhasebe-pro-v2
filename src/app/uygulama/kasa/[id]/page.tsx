import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { KasaHareketTip } from "@/lib/enums";
import { KasaDetay, type KasaDetayHareket } from "./kasa-detay";

export const metadata = { title: "Kasa Detayı" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aralik?: string }>;
}

export default async function KasaDetayPage({
  params,
  searchParams,
}: PageProps) {
  if (!(await isModuleActive("kasa"))) {
    return <ModuleClosed modulAd="Kasa" />;
  }
  const { id } = await params;
  const kasaId = Number(id);
  if (!Number.isFinite(kasaId) || kasaId <= 0) notFound();

  const orgId = await getOrgId();
  const { aralik = "30" } = await searchParams;

  const kasa = await db.kasa.findFirst({
    where: { id: kasaId, organizationId: orgId },
  });
  if (!kasa) notFound();

  // Aralık filtresi
  const simdi = new Date();
  let tarihFilter: { gte?: Date } = {};
  if (aralik === "30") {
    const otuz = new Date(simdi);
    otuz.setDate(otuz.getDate() - 30);
    tarihFilter = { gte: otuz };
  } else if (aralik === "90") {
    const doksan = new Date(simdi);
    doksan.setDate(doksan.getDate() - 90);
    tarihFilter = { gte: doksan };
  }

  // Aktif kasalar (transfer için)
  const aktifKasalar = await db.kasa.findMany({
    where: { organizationId: orgId, aktif: true },
    select: { id: true, ad: true, paraBirimi: true },
    orderBy: { ad: "asc" },
  });

  // Filtreli hareketler (görüntü için)
  const hareketler = await db.kasaHareketi.findMany({
    where: {
      organizationId: orgId,
      kasaId,
      ...(tarihFilter.gte ? { tarih: tarihFilter } : {}),
    },
    orderBy: [{ tarih: "desc" }, { id: "desc" }],
    take: 500,
  });

  // Toplam hesaplaması — TÜM hareketler üzerinden (aralık bağımsız), bakiye için.
  const tumHareketler = await db.kasaHareketi.findMany({
    where: { organizationId: orgId, kasaId },
    select: { id: true, tip: true, tutar: true, belgeNo: true, kasaId: true },
    orderBy: { id: "asc" },
  });

  // Transferleri belgeNo başına ilk gelen=çıkış, ikinci=giriş mantığıyla say
  // ANCAK burada sadece kendi kasaId'mizin kayıtları var, bu yüzden
  // belgeNo bazlı sıralamayı kullanmıyoruz; her transfer kaydı bu kasa için
  // ya kaynak ya hedef. İkisini ayırt etmek için orgId genelinde min(id) bakacağız.
  // Pratik yaklaşım: bu kasa içinde aynı belgeNo'nun yalnız BİR kaydı var
  // (kaynak veya hedef olarak), bu yüzden ilk-id kuralı kasa içinde
  // doğrudan uygulanamaz. Bunun yerine global belgeNo'ya bakıyoruz.
  const transferBelgeNos = tumHareketler
    .filter((h) => h.tip === KasaHareketTip.Transfer && h.belgeNo)
    .map((h) => h.belgeNo as string);

  // Global olarak bu belgeNo'lar için min(id) kayıtlarını çek
  const globalTransfers =
    transferBelgeNos.length > 0
      ? await db.kasaHareketi.findMany({
          where: {
            organizationId: orgId,
            tip: KasaHareketTip.Transfer,
            belgeNo: { in: transferBelgeNos },
          },
          select: { id: true, kasaId: true, belgeNo: true },
          orderBy: { id: "asc" },
        })
      : [];

  // belgeNo -> kaynakKasaId (min id'li kayıt)
  const kaynakMap = new Map<string, number>();
  for (const g of globalTransfers) {
    if (!g.belgeNo) continue;
    if (!kaynakMap.has(g.belgeNo)) {
      kaynakMap.set(g.belgeNo, g.kasaId);
    }
  }

  let toplamGiris = 0;
  let toplamCikis = 0;
  for (const h of tumHareketler) {
    const tutar = Number(h.tutar);
    if (h.tip === KasaHareketTip.Giris) {
      toplamGiris += tutar;
    } else if (h.tip === KasaHareketTip.Cikis) {
      toplamCikis += tutar;
    } else if (h.tip === KasaHareketTip.Transfer && h.belgeNo) {
      const kaynakKasaId = kaynakMap.get(h.belgeNo);
      // Kaynak kasa = bu kasa ise çıkış, değilse giriş
      if (kaynakKasaId === kasaId) {
        toplamCikis += tutar;
      } else {
        toplamGiris += tutar;
      }
    }
  }

  const acilis = Number(kasa.acilis);
  const bakiye = acilis + toplamGiris - toplamCikis;

  // Hareket listesi için yön etiketi (Transfer için giriş/çıkış belirleme)
  const rows: KasaDetayHareket[] = hareketler.map((h) => {
    let yon: "giris" | "cikis" = "giris";
    if (h.tip === KasaHareketTip.Giris) yon = "giris";
    else if (h.tip === KasaHareketTip.Cikis) yon = "cikis";
    else if (h.tip === KasaHareketTip.Transfer && h.belgeNo) {
      const kaynakKasaId = kaynakMap.get(h.belgeNo);
      yon = kaynakKasaId === kasaId ? "cikis" : "giris";
    }
    return {
      id: h.id,
      tip: h.tip,
      yon,
      tutar: h.tutar.toString(),
      paraBirimi: h.paraBirimi,
      tarih: h.tarih.toISOString(),
      aciklama: h.aciklama,
      belgeNo: h.belgeNo,
      hedefKasaId: h.hedefKasaId,
    };
  });

  return (
    <KasaDetay
      kasa={{
        id: kasa.id,
        ad: kasa.ad,
        paraBirimi: kasa.paraBirimi,
        acilis: acilis.toString(),
        aktif: kasa.aktif,
        varsayilan: kasa.varsayilan,
        aciklama: kasa.aciklama,
        bakiye: bakiye.toString(),
        toplamGiris: toplamGiris.toString(),
        toplamCikis: toplamCikis.toString(),
      }}
      hareketler={rows}
      aktifKasalar={aktifKasalar}
      aralik={aralik}
    />
  );
}
