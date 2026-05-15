import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { KasaHareketTip } from "@/lib/enums";
import { KasaList, type KasaRow } from "./kasa-list";

export const metadata = { title: "Kasa" };
export const dynamic = "force-dynamic";

export default async function KasaPage() {
  if (!(await isModuleActive("kasa"))) {
    return <ModuleClosed modulAd="Kasa" />;
  }
  const orgId = await getOrgId();

  const [kasalar, hareketler] = await Promise.all([
    db.kasa.findMany({
      where: { organizationId: orgId },
      orderBy: [{ varsayilan: "desc" }, { aktif: "desc" }, { ad: "asc" }],
    }),
    db.kasaHareketi.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        kasaId: true,
        hedefKasaId: true,
        tip: true,
        tutar: true,
        belgeNo: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  // Kasa id -> { giris, cikis }
  const toplamlar = new Map<number, { giris: number; cikis: number }>();
  for (const k of kasalar) {
    toplamlar.set(k.id, { giris: 0, cikis: 0 });
  }

  // Transferler için belgeNo bazlı eşleme:
  // İlk yaratılan kayıt (min id) = kaynak (çıkış); ikincisi = hedef (giriş).
  const seenTransfer = new Set<string>();

  for (const h of hareketler) {
    const tutar = Number(h.tutar);
    const target = toplamlar.get(h.kasaId);
    if (!target) continue;

    if (h.tip === KasaHareketTip.Giris) {
      target.giris += tutar;
    } else if (h.tip === KasaHareketTip.Cikis) {
      target.cikis += tutar;
    } else if (h.tip === KasaHareketTip.Transfer && h.belgeNo) {
      // İlk gelen kayıt = kaynak (çıkış), ikincisi = hedef (giriş)
      if (!seenTransfer.has(h.belgeNo)) {
        seenTransfer.add(h.belgeNo);
        target.cikis += tutar;
      } else {
        target.giris += tutar;
      }
    }
  }

  const rows: KasaRow[] = kasalar.map((k) => {
    const t = toplamlar.get(k.id) ?? { giris: 0, cikis: 0 };
    const acilis = Number(k.acilis);
    const bakiye = acilis + t.giris - t.cikis;
    return {
      id: k.id,
      ad: k.ad,
      paraBirimi: k.paraBirimi,
      acilis: acilis.toString(),
      aktif: k.aktif,
      varsayilan: k.varsayilan,
      aciklama: k.aciklama,
      toplamGiris: t.giris.toString(),
      toplamCikis: t.cikis.toString(),
      bakiye: bakiye.toString(),
    };
  });

  return <KasaList items={rows} />;
}
