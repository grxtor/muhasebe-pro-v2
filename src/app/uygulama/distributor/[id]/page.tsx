import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { isModuleActive } from "@/lib/module-guard";
import { ModuleClosed } from "@/components/ui/module-closed";
import { eslesmeleriOnerErr } from "../actions";
import {
  DistributorDetail,
  type DetayProps,
  type PromosyonOdemeNotu,
} from "./detail-view";

export const dynamic = "force-dynamic";

interface PageParams {
  id: string;
}

export default async function Page({
  params,
}: {
  params: Promise<PageParams>;
}) {
  if (!(await isModuleActive("distributor"))) {
    return <ModuleClosed modulAd="Distribütör Rapor" />;
  }

  const { id: idParam } = await params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id)) notFound();

  const orgId = await getOrgId();
  const rapor = await db.distributorRapor.findFirst({
    where: { id, organizationId: orgId },
    include: {
      odemeNotlari: {
        select: {
          id: true,
          baslik: true,
          tutar: true,
          paraBirimi: true,
          detay: true,
          cari: { select: { id: true, kod: true, unvan: true } },
        },
      },
    },
  });
  if (!rapor) notFound();

  const raw = rapor.rawData as {
    mapping?: { trackName: string; revenue: string; streams?: string };
    rows?: Array<Record<string, unknown>>;
  } | null;

  const mapping = raw?.mapping ?? null;
  const rows = raw?.rows ?? [];

  // Detay satır listesi
  const detaySatirlar: DetayProps["detaySatirlar"] = mapping
    ? rows.map((r) => {
        const trackVal = r[mapping.trackName];
        const revenueVal = r[mapping.revenue];
        const streamVal = mapping.streams ? r[mapping.streams] : null;
        return {
          track: trackVal == null ? "" : String(trackVal),
          revenue:
            typeof revenueVal === "number"
              ? revenueVal
              : Number(String(revenueVal ?? "0").replace(/[^\d.-]/g, "")) || 0,
          stream:
            streamVal == null
              ? null
              : Math.trunc(
                  typeof streamVal === "number"
                    ? streamVal
                    : Number(String(streamVal).replace(/[^\d.-]/g, "")) || 0,
                ),
        };
      })
    : [];

  // Bağlı kayıtlar
  const bagliKayitlar: PromosyonOdemeNotu[] = rapor.odemeNotlari.map((n) => {
    const detay = n.detay as { videoBasligi?: string; platform?: string } | null;
    return {
      id: n.id,
      baslik: n.baslik,
      tutar: n.tutar.toString(),
      paraBirimi: n.paraBirimi,
      cari: n.cari ? { id: n.cari.id, unvan: n.cari.unvan, kod: n.cari.kod } : null,
      videoBasligi: detay?.videoBasligi ?? null,
      platform: detay?.platform ?? null,
    };
  });

  // Eşleşme önerileri
  const onerilerRes = await eslesmeleriOnerErr(id);
  const oneriler = onerilerRes.ok ? (onerilerRes.data ?? []) : [];

  return (
    <DistributorDetail
      rapor={{
        id: rapor.id,
        ad: rapor.ad,
        platform: rapor.platform,
        donem: rapor.donem,
        dosyaAdi: rapor.dosyaAdi,
        toplamGelir: rapor.toplamGelir.toString(),
        paraBirimi: rapor.paraBirimi,
        toplamStream: rapor.toplamStream,
        satirSayisi: rapor.satirSayisi,
        notlar: rapor.notlar,
        olusturmaTarihi: rapor.olusturmaTarihi.toISOString(),
      }}
      detaySatirlar={detaySatirlar}
      bagliKayitlar={bagliKayitlar}
      oneriler={oneriler}
    />
  );
}
