"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

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
          E-posta ve şifrenizle devam edin
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
