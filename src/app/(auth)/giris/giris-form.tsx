"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { loginAction, googleLoginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function GirisForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-6">
      <header className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hesabınıza giriş yapın
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          E-posta ve şifrenizle veya Google ile devam edin
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
          <label
            htmlFor="email"
            className="text-sm font-medium"
            style={{ color: "var(--text)" }}
          >
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ornek@firma.com"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-strong)",
              color: "var(--text)",
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium"
            style={{ color: "var(--text)" }}
          >
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
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
          fullWidth
          isDisabled={pending}
        >
          {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </form>

      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 flex items-center"
        >
          <div
            className="w-full border-t"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className="px-2"
            style={{
              background: "var(--surface)",
              color: "var(--text-soft)",
            }}
          >
            VEYA
          </span>
        </div>
      </div>

      <form action={googleLoginAction}>
        <Button type="submit" variant="outline" fullWidth>
          <span className="inline-flex items-center gap-2">
            <GoogleIcon /> Google ile devam et
          </span>
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Hesabın yok mu?{" "}
        <Link
          href="/kayit"
          className="font-medium hover:underline"
          style={{ color: "var(--brand)" }}
        >
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
