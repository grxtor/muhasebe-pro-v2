"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Building2, Shield } from "lucide-react";
import { Button } from "@heroui/react";
import { acceptInvitation } from "../../../uygulama/ayarlar/ekibim/actions";

const ROLE_LABEL: Record<string, string> = {
  Owner: "Sahip",
  Admin: "Yönetici",
  Muhasebeci: "Muhasebeci",
  Goruntuleyici: "Görüntüleyici",
};

interface Props {
  token: string;
  email: string;
  role: string;
  orgAd: string;
  mevcutKullanici: { adSoyad: string } | null;
}

export function DavetForm({
  token,
  email,
  role,
  orgAd,
  mevcutKullanici,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    formData.set("token", token);
    setError(null);
    start(async () => {
      const r = await acceptInvitation(formData);
      if (r.ok) {
        setAccepted(true);
        // 2 saniye sonra login'e yönlendir
        setTimeout(() => {
          router.push(`/giris?email=${encodeURIComponent(email)}`);
        }, 1800);
      } else {
        setError(r.error);
      }
    });
  }

  if (accepted) {
    return (
      <div className="space-y-6 text-center">
        <div
          className="mx-auto grid size-14 place-items-center rounded-full"
          style={{
            background: "var(--positive-soft)",
            color: "var(--positive)",
          }}
        >
          <CheckCircle2 size={28} />
        </div>
        <header className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Davet kabul edildi! 🎉
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {mevcutKullanici
              ? `${orgAd} şirketine ${ROLE_LABEL[role] ?? role} olarak eklendin.`
              : `Hesabın oluşturuldu ve ${orgAd} şirketine eklendin.`}
          </p>
          <p
            className="pt-2 text-xs"
            style={{ color: "var(--text-soft)" }}
          >
            Giriş sayfasına yönlendiriliyorsun…
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mevcutKullanici
            ? `Merhaba ${mevcutKullanici.adSoyad || email}`
            : "Şirkete davet edildin"}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>{orgAd}</strong> şirketine
          katılmak için davet edildin.
        </p>

        {/* Davet detay kartı */}
        <div
          className="mt-3 grid gap-2 rounded-lg border p-3 text-left text-xs"
          style={{
            background: "var(--surface-muted)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Building2 size={13} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-muted)" }}>Şirket:</span>
            <strong>{orgAd}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={13} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-muted)" }}>Rol:</span>
            <strong>{ROLE_LABEL[role] ?? role}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-muted)" }}>E-posta:</span>
            <strong className="break-all">{email}</strong>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
          style={{
            background: "var(--negative-soft)",
            borderColor:
              "color-mix(in oklch, var(--negative) 30%, transparent)",
            color: "var(--negative)",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {mevcutKullanici ? (
        // Kullanıcı zaten var — sadece kabul et
        <form action={submit} className="space-y-4">
          <div
            className="rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-soft)",
            }}
          >
            Bu e-posta zaten kayıtlı. Daveti kabul ettiğinde mevcut hesabınla
            <strong style={{ color: "var(--text)" }}> {orgAd}</strong>'a
            katılırsın.
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isDisabled={pending}
            className="w-full"
          >
            {pending ? "Kabul ediliyor…" : `${orgAd}'a katıl`}
          </Button>
          <p
            className="text-center text-xs"
            style={{ color: "var(--text-soft)" }}
          >
            Zaten giriş yapmış olmana gerek yok — kabul edince giriş sayfasına
            yönleneceksin.
          </p>
        </form>
      ) : (
        // Yeni kullanıcı — kayıt formu
        <form action={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="adSoyad"
              className="text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Ad Soyad
            </label>
            <input
              id="adSoyad"
              name="adSoyad"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Mehmet Demir"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              E-posta
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--surface-muted)",
                borderColor: "var(--border)",
                color: "var(--text-muted)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sifre"
              className="text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Şifre belirle <span style={{ color: "var(--text-soft)" }}>(en az 6 karakter)</span>
            </label>
            <input
              id="sifre"
              name="sifre"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text)",
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isDisabled={pending}
            className="w-full"
          >
            {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur ve Katıl"}
          </Button>
        </form>
      )}

      <p
        className="text-center text-xs"
        style={{ color: "var(--text-soft)" }}
      >
        Başka bir hesapla mı giriş yapmak istiyorsun?{" "}
        <Link
          href="/giris"
          className="underline"
          style={{ color: "var(--text-muted)" }}
        >
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
