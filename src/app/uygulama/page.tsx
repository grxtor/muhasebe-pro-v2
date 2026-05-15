import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  CalendarClock,
  ArrowRight,
  FileText,
  Users,
  Truck,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/auth-helpers";
import {
  OdemeYonu,
  OdemeDurumu,
  HareketTipi,
  FaturaDurumu,
} from "@/lib/enums";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPara, formatVade, selamlama } from "@/lib/format";
import {
  AylikGelirGiderChart,
  BekleyenPieChart,
  TopCariList,
  type AylikSeriPoint,
  type TopCariRow,
} from "./_components/dashboard-charts";

export const metadata = { title: "Anasayfa" };
export const dynamic = "force-dynamic";

export default async function Anasayfa() {
  const orgId = await getOrgId();
  const session = await auth();
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const acikDurumlar = {
    in: [OdemeDurumu.Beklemede, OdemeDurumu.KismiOdendi] as never,
  };

  // Son 6 ayın ilk gününü hesapla (içinde bulunulan ay dahil)
  const altiAyBaslangic = new Date(
    bugun.getFullYear(),
    bugun.getMonth() - 5,
    1,
  );

  const [
    alacakAgg,
    borcAgg,
    vadesiGecenAlacak,
    vadesiGecenBorc,
    bekleyenFaturaCount,
    yaklasanAlacak,
    yaklasanBorc,
    aylikHareketler,
    topMusteriler,
    topTedarikciler,
  ] = await Promise.all([
    db.odemeNotu.aggregate({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
      },
      _sum: { tutar: true, odenenTutar: true },
    }),
    db.odemeNotu.aggregate({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
      },
      _sum: { tutar: true, odenenTutar: true },
    }),
    db.odemeNotu.count({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
        vadeTarihi: { lt: bugun },
      },
    }),
    db.odemeNotu.count({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
        vadeTarihi: { lt: bugun },
      },
    }),
    db.fatura.count({
      where: {
        organizationId: orgId,
        durum: {
          in: [FaturaDurumu.Beklemede, FaturaDurumu.KismiOdendi] as never,
        },
      },
    }),
    db.odemeNotu.findMany({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
      },
      orderBy: { vadeTarihi: "asc" },
      take: 6,
      include: { cari: { select: { unvan: true } } },
    }),
    db.odemeNotu.findMany({
      where: {
        organizationId: orgId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
      },
      orderBy: { vadeTarihi: "asc" },
      take: 6,
      include: { cari: { select: { unvan: true } } },
    }),
    db.hareket.findMany({
      where: {
        organizationId: orgId,
        tarih: { gte: altiAyBaslangic },
      },
      select: { tarih: true, tip: true, tutar: true },
    }),
    // Top 5 Müşteri — en çok alacak yapılan profiller
    db.hareket.groupBy({
      by: ["cariId"],
      where: {
        organizationId: orgId,
        tip: HareketTipi.Alacak as never,
      },
      _sum: { tutar: true },
      orderBy: { _sum: { tutar: "desc" } },
      take: 5,
    }),
    // Top 5 Tedarikçi — en çok borç ödenen profiller
    db.hareket.groupBy({
      by: ["cariId"],
      where: {
        organizationId: orgId,
        tip: HareketTipi.Borc as never,
      },
      _sum: { tutar: true },
      orderBy: { _sum: { tutar: "desc" } },
      take: 5,
    }),
  ]);

  const alacak =
    Number(alacakAgg._sum.tutar ?? 0) - Number(alacakAgg._sum.odenenTutar ?? 0);
  const borc =
    Number(borcAgg._sum.tutar ?? 0) - Number(borcAgg._sum.odenenTutar ?? 0);
  const net = alacak - borc;

  const isim =
    session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Kullanıcı";

  /* ------------------------------------------------------------
     Aylık gelir/gider serisi — son 6 ay, hareketleri aya göre topla
     ------------------------------------------------------------ */
  const aylikSeri: AylikSeriPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const ayBas = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1);
    aylikSeri.push({
      ay: ayEtiket(ayBas),
      alacak: 0,
      borc: 0,
    });
  }
  for (const h of aylikHareketler) {
    const t = new Date(h.tarih);
    // Bucket index: bugünün ayına göre kaç ay geriye
    const aylarFark =
      (bugun.getFullYear() - t.getFullYear()) * 12 +
      (bugun.getMonth() - t.getMonth());
    const idx = 5 - aylarFark;
    if (idx < 0 || idx >= aylikSeri.length) continue;
    const tutar = Number(h.tutar);
    if (h.tip === HareketTipi.Alacak) {
      aylikSeri[idx].alacak += tutar;
    } else {
      aylikSeri[idx].borc += tutar;
    }
  }

  /* ------------------------------------------------------------
     Top cari resolve — groupBy sonrası id→unvan mapping
     ------------------------------------------------------------ */
  const tumCariIdler = [
    ...new Set([
      ...topMusteriler.map((r) => r.cariId),
      ...topTedarikciler.map((r) => r.cariId),
    ]),
  ];
  const cariUnvanlar =
    tumCariIdler.length > 0
      ? await db.cari.findMany({
          where: { id: { in: tumCariIdler }, organizationId: orgId },
          select: { id: true, unvan: true },
        })
      : [];
  const unvanMap = new Map(cariUnvanlar.map((c) => [c.id, c.unvan]));

  const topMusteriRows: TopCariRow[] = topMusteriler
    .map((r) => ({
      cariId: r.cariId,
      unvan: unvanMap.get(r.cariId) ?? "—",
      toplam: Number(r._sum.tutar ?? 0),
      paraBirimi: "TRY",
    }))
    .filter((r) => r.toplam > 0);

  const topTedarikciRows: TopCariRow[] = topTedarikciler
    .map((r) => ({
      cariId: r.cariId,
      unvan: unvanMap.get(r.cariId) ?? "—",
      toplam: Number(r._sum.tutar ?? 0),
      paraBirimi: "TRY",
    }))
    .filter((r) => r.toplam > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Anasayfa</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {selamlama()}, {isim} —{" "}
          {new Date().toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            weekday: "long",
          })}
        </p>
      </header>

      {/* 1) Ana KPI kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Toplam Alacak"
          value={formatPara(alacak)}
          hint={
            vadesiGecenAlacak > 0
              ? `${vadesiGecenAlacak} adet vadesi geçti`
              : "Tüm vadeler güncel"
          }
          tone="positive"
          icon={<TrendingDown size={20} />}
        />
        <StatCard
          label="Toplam Borç"
          value={formatPara(borc)}
          hint={
            vadesiGecenBorc > 0
              ? `${vadesiGecenBorc} adet vadesi geçti`
              : "Tüm vadeler güncel"
          }
          tone="negative"
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Net Bakiye"
          value={formatPara(net)}
          hint={
            net >= 0 ? "Alacaklı pozisyondasınız" : "Borçlu pozisyondasınız"
          }
          tone="brand"
          icon={<BarChart3 size={20} />}
        />
        <StatCard
          label="Bekleyen Faturalar"
          value={String(bekleyenFaturaCount)}
          hint={
            bekleyenFaturaCount > 0 ? "Henüz tahsil edilmedi" : "Tüm faturalar kapalı"
          }
          tone="warning"
          icon={<FileText size={20} />}
        />
      </div>

      {/* 2-3) Aylık gelir/gider + Bekleyen pie */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AylikGelirGiderChart data={aylikSeri} />
        <BekleyenPieChart data={{ alacak, borc }} />
      </div>

      {/* 4-5) Top Müşteri / Top Tedarikçi */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopCariList
          baslik="Top 5 Müşteri"
          altBaslik="En çok tahsilat yapılan profiller"
          items={topMusteriRows}
          tone="positive"
          bosMesaj="Henüz tahsilat yok"
        />
        <TopCariList
          baslik="Top 5 Tedarikçi"
          altBaslik="En çok ödeme yapılan profiller"
          items={topTedarikciRows}
          tone="negative"
          bosMesaj="Henüz ödeme yok"
        />
      </div>

      {/* Yaklaşan tahsilat/ödeme kartları */}
      <div className="grid gap-4 lg:grid-cols-2">
        <YaklasanKart
          baslik="Yaklaşan Tahsilatlar"
          href="/uygulama/alacaklar"
          items={yaklasanAlacak.map((o) => ({
            id: o.id,
            baslik: o.baslik,
            unvan: o.cari?.unvan ?? "",
            vadeTarihi: o.vadeTarihi.toISOString(),
            kalan: Number(o.tutar) - Number(o.odenenTutar),
            paraBirimi: o.paraBirimi,
          }))}
          tone="positive"
          bosMesaj="Bekleyen tahsilat yok"
          ikon={<Users size={20} />}
        />
        <YaklasanKart
          baslik="Yaklaşan Ödemeler"
          href="/uygulama/borclar"
          items={yaklasanBorc.map((o) => ({
            id: o.id,
            baslik: o.baslik,
            unvan: o.cari?.unvan ?? "",
            vadeTarihi: o.vadeTarihi.toISOString(),
            kalan: Number(o.tutar) - Number(o.odenenTutar),
            paraBirimi: o.paraBirimi,
          }))}
          tone="negative"
          bosMesaj="Bekleyen ödeme yok"
          ikon={<Truck size={20} />}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Yaklaşan kart bileşeni (server)
   ============================================================ */

function YaklasanKart({
  baslik,
  href,
  items,
  tone,
  bosMesaj,
  ikon,
}: {
  baslik: string;
  href: string;
  items: {
    id: number;
    baslik: string;
    unvan: string;
    vadeTarihi: string;
    kalan: number;
    paraBirimi: string;
  }[];
  tone: "positive" | "negative";
  bosMesaj: string;
  ikon?: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <header
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {ikon && (
            <span style={{ color: "var(--text-muted)" }}>{ikon}</span>
          )}
          {baslik}
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          Tümünü gör <ArrowRight size={12} />
        </Link>
      </header>
      {items.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            compact
            icon={<CalendarClock size={20} />}
            title={bosMesaj}
          />
        </div>
      ) : (
        <ul>
          {items.map((o, i) => {
            const vade = formatVade(o.vadeTarihi);
            return (
              <li
                key={o.id}
                className="flex items-center justify-between px-5 py-3"
                style={{
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {o.baslik}
                  </div>
                  <div
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {o.unvan} ·{" "}
                    <span
                      style={{
                        color:
                          vade.durum === "gecikti"
                            ? "var(--negative)"
                            : vade.durum === "bugun"
                            ? "var(--warning)"
                            : "var(--text-muted)",
                      }}
                    >
                      {vade.metin}
                    </span>
                  </div>
                </div>
                <div
                  className="shrink-0 pl-3 font-semibold tabular-nums"
                  style={{
                    color:
                      tone === "positive"
                        ? "var(--positive)"
                        : "var(--negative)",
                  }}
                >
                  {formatPara(o.kalan, o.paraBirimi)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   Yardımcılar
   ============================================================ */

const AY_KISA = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/** Date → "Oca 26" gibi kısa etiket */
function ayEtiket(d: Date): string {
  const ay = AY_KISA[d.getMonth()] ?? "";
  const yil = String(d.getFullYear()).slice(-2);
  return `${ay} ${yil}`;
}
