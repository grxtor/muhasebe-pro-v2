import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Arka plan dekorasyonu */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--brand) 12%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Üst bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            ₺
          </span>
          Muhasebe Pro
        </Link>
        <nav className="flex items-center gap-2">
          <LinkButton href="/giris" variant="ghost" size="sm">
            Giriş Yap
          </LinkButton>
          <LinkButton href="/kayit" variant="primary" size="sm">
            Kayıt Ol
          </LinkButton>
        </nav>
      </header>

      {/* Kahraman bölüm */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            background: "var(--brand-soft)",
            borderColor: "color-mix(in oklch, var(--brand) 20%, transparent)",
            color: "var(--brand)",
          }}
        >
          <Zap size={14} /> Yeni · v2 modern arayüz
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Faturanı, alacağını, borcunu{" "}
          <span style={{ color: "var(--brand)" }}>tek yerden</span> yönet
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl text-lg"
          style={{ color: "var(--text-muted)" }}
        >
          Çok kullanıcılı, modern, web ve masaüstünden çalışan muhasebe takip
          uygulaması. KDV otomatik, vade hatırlatıcılı, mobil uyumlu.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <LinkButton href="/kayit" variant="primary" size="lg">
            <span className="flex items-center gap-1.5">
              Ücretsiz Başla <ArrowRight size={16} />
            </span>
          </LinkButton>
          <LinkButton href="/giris" variant="ghost" size="lg">
            Giriş Yap
          </LinkButton>
        </div>
      </section>

      {/* Özellikler */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-3">
        {[
          {
            icon: BarChart3,
            title: "Canlı Pano",
            desc: "Alacak, borç, net pozisyon, vade ısı haritası — anasayfada.",
          },
          {
            icon: Zap,
            title: "KDV Otomatik",
            desc: "Fatura girerken oran seç, toplam ve dağılım otomatik hesaplansın.",
          },
          {
            icon: ShieldCheck,
            title: "Güvenli & Çok Kullanıcılı",
            desc: "Her hesap kendi verisini görür, e-posta + şifre veya Google ile giriş.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <Icon size={22} style={{ color: "var(--brand)" }} />
            <h3 className="mt-4 text-base font-semibold">{title}</h3>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {desc}
            </p>
          </div>
        ))}
      </section>

      <footer
        className="mx-auto max-w-6xl px-6 py-10 text-center text-xs"
        style={{ color: "var(--text-soft)" }}
      >
        © {new Date().getFullYear()} Ocean Yazılım · Muhasebe Pro v2
      </footer>
    </main>
  );
}
