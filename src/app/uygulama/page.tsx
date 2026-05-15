import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getUserId } from "@/lib/auth-helpers";
import { OdemeYonu, OdemeDurumu } from "@/lib/enums";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPara, formatVade, selamlama } from "@/lib/format";

export const metadata = { title: "Anasayfa" };
export const dynamic = "force-dynamic";

export default async function Anasayfa() {
  const userId = await getUserId();
  const session = await auth();
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const acikDurumlar = {
    in: [OdemeDurumu.Beklemede, OdemeDurumu.KismiOdendi] as never,
  };

  const [
    alacakAgg,
    borcAgg,
    vadesiGecenAlacak,
    vadesiGecenBorc,
    yaklasanAlacak,
    yaklasanBorc,
  ] = await Promise.all([
    db.odemeNotu.aggregate({
      where: {
        userId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
      },
      _sum: { tutar: true, odenenTutar: true },
    }),
    db.odemeNotu.aggregate({
      where: {
        userId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
      },
      _sum: { tutar: true, odenenTutar: true },
    }),
    db.odemeNotu.count({
      where: {
        userId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
        vadeTarihi: { lt: bugun },
      },
    }),
    db.odemeNotu.count({
      where: {
        userId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
        vadeTarihi: { lt: bugun },
      },
    }),
    db.odemeNotu.findMany({
      where: {
        userId,
        yon: OdemeYonu.Alacak as never,
        durum: acikDurumlar,
      },
      orderBy: { vadeTarihi: "asc" },
      take: 6,
      include: { cari: { select: { unvan: true } } },
    }),
    db.odemeNotu.findMany({
      where: {
        userId,
        yon: OdemeYonu.Borc as never,
        durum: acikDurumlar,
      },
      orderBy: { vadeTarihi: "asc" },
      take: 6,
      include: { cari: { select: { unvan: true } } },
    }),
  ]);

  const alacak =
    Number(alacakAgg._sum.tutar ?? 0) - Number(alacakAgg._sum.odenenTutar ?? 0);
  const borc =
    Number(borcAgg._sum.tutar ?? 0) - Number(borcAgg._sum.odenenTutar ?? 0);
  const net = alacak - borc;

  const isim =
    session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Kullanıcı";

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Alacaklarımız"
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
          label="Borçlarımız"
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
          label="Net Pozisyon"
          value={formatPara(net)}
          hint={
            net >= 0 ? "Alacaklı pozisyondasınız" : "Borçlu pozisyondasınız"
          }
          tone="brand"
          icon={<BarChart3 size={20} />}
        />
      </div>

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
        />
      </div>
    </div>
  );
}

function YaklasanKart({
  baslik,
  href,
  items,
  tone,
  bosMesaj,
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
        <h2 className="text-base font-semibold">{baslik}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
          style={{ color: "var(--brand)" }}
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
