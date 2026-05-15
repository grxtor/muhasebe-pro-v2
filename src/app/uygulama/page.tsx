import { auth } from "@/auth";
import { Sparkles, Rocket } from "lucide-react";

export const metadata = {
  title: "Anasayfa",
};

export default async function UygulamaAnasayfa() {
  const session = await auth();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Anasayfa</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Hoş geldin, {session?.user?.name ?? "Kullanıcı"} —{" "}
          {new Date().toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            weekday: "long",
          })}
        </p>
      </header>

      <div
        className="flex items-start gap-4 rounded-xl border p-6"
        style={{
          background: "var(--brand-soft)",
          borderColor: "color-mix(in oklch, var(--brand) 25%, transparent)",
        }}
      >
        <Sparkles
          size={22}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--brand)" }}
        />
        <div className="space-y-1">
          <h2 className="font-semibold">Muhasebe Pro v2 — Sprint 1 Foundation</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Şu an Sprint 1 (Hafta 1) tamamlandı: Next.js 16 + TypeScript +
            Tailwind v4 + HeroUI v3 + Prisma + Auth.js v5 + i18n + PWA + dark
            mode + protected app shell çalışıyor. Sprint 2'de Profiller +
            Faturalar + Alacaklar/Borçlar CRUD ekranları gelecek.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Alacaklar", deger: "—" },
          { label: "Borçlar", deger: "—" },
          { label: "Net Pozisyon", deger: "—" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {k.deger}
            </div>
            <div
              className="mt-1 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              Sprint 2'de doldurulacak
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <Rocket size={20} style={{ color: "var(--brand)" }} />
          <div>
            <h3 className="font-semibold">Sıradaki: Sprint 2 — Core CRUD</h3>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Profiller (müşteri/tedarikçi yönetimi), Faturalar (KDV otomatik +
              alacak/borç üretimi), Alacaklar/Borçlar (tahsil et + kısmi
              ödeme), Hareketler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
