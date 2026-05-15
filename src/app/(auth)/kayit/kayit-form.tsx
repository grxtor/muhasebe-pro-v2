"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors";

const inputStyle = {
  background: "var(--surface)",
  borderColor: "var(--border-strong)",
  color: "var(--text)",
} as const;

const labelStyle = { color: "var(--text)" } as const;

export function KayitForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Yeni hesap oluştur
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Birkaç bilgiyle hemen başlayın
        </p>
      </header>

      {state.error && (
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
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="adSoyad" className="text-sm font-medium" style={labelStyle}>
            Ad Soyad
          </label>
          <input
            id="adSoyad"
            name="adSoyad"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            placeholder="Ahmet Yılmaz"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sirketAdi" className="text-sm font-medium" style={labelStyle}>
            Şirket adı{" "}
            <span className="font-normal" style={{ color: "var(--text-soft)" }}>
              (opsiyonel)
            </span>
          </label>
          <input
            id="sirketAdi"
            name="sirketAdi"
            type="text"
            autoComplete="organization"
            placeholder="Örnek Yazılım Ltd."
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium" style={labelStyle}>
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ornek@firma.com"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium" style={labelStyle}>
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="passwordConfirm" className="text-sm font-medium" style={labelStyle}>
              Şifre tekrar
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <Button type="submit" variant="primary" fullWidth isDisabled={pending}>
          {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Zaten hesabın var mı?{" "}
        <Link
          href="/giris"
          className="font-medium hover:underline"
          style={{ color: "var(--brand)" }}
        >
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
