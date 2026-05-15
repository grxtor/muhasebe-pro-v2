"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Home,
  TrendingDown,
  TrendingUp,
  Users,
  Receipt,
  ListOrdered,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@heroui/react";

interface AppShellProps {
  user: { name: string; email: string; image: string | null };
  children: React.ReactNode;
}

const navItems = [
  { href: "/uygulama", label: "Anasayfa", icon: Home, exact: true },
  { href: "/uygulama/alacaklar", label: "Alacaklar", icon: TrendingDown },
  { href: "/uygulama/borclar", label: "Borçlar", icon: TrendingUp },
  { href: "/uygulama/profiller", label: "Profiller", icon: Users },
  { href: "/uygulama/faturalar", label: "Faturalar", icon: Receipt },
  { href: "/uygulama/hareketler", label: "Hareketler", icon: ListOrdered },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — desktop */}
      <aside
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col md:flex"
        style={{
          background:
            "linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-2) 100%)",
          color: "var(--sidebar-text)",
        }}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/5 px-5 text-base font-semibold tracking-tight" style={{ color: "var(--sidebar-text-strong)" }}>
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-md text-white text-sm"
            style={{ background: "var(--sidebar-active)" }}
          >
            ₺
          </span>
          Muhasebe Pro
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href, item.exact)}
            />
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col"
            style={{
              background:
                "linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-2) 100%)",
              color: "var(--sidebar-text)",
            }}
          >
            <div className="flex h-14 items-center justify-between gap-2 border-b border-white/5 px-4 text-base font-semibold" style={{ color: "var(--sidebar-text-strong)" }}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-md text-white text-sm"
                  style={{ background: "var(--sidebar-active)" }}
                >
                  ₺
                </span>
                Muhasebe Pro
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 hover:bg-white/10"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={isActive(item.href, item.exact)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-white/5 p-3">
              <UserMenu user={user} />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:px-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 hover:bg-black/5 md:hidden"
              aria-label="Menüyü aç"
              style={{ color: "var(--text)" }}
            >
              <Menu size={20} />
            </button>
            <span className="hidden text-sm md:inline" style={{ color: "var(--text-muted)" }}>
              {greeting()}, {user.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={() =>
                setTheme(
                  (resolvedTheme ?? theme) === "dark" ? "light" : "dark",
                )
              }
              aria-label="Temayı değiştir"
            >
              {(resolvedTheme ?? theme) === "dark" ? (
                <Sun size={16} />
              ) : (
                <Moon size={16} />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        background: active
          ? "color-mix(in oklch, var(--brand) 22%, transparent)"
          : "transparent",
        color: active ? "var(--sidebar-text-strong)" : "var(--sidebar-text)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full"
          style={{ background: "var(--sidebar-active)" }}
        />
      )}
      <Icon size={16} />
      {label}
    </Link>
  );
}

function UserMenu({ user }: { user: AppShellProps["user"] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <div
          className="grid size-8 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: "var(--sidebar-active)" }}
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-xs font-medium"
            style={{ color: "var(--sidebar-text-strong)" }}
          >
            {user.name}
          </div>
          <div className="truncate text-[11px]" style={{ color: "var(--sidebar-text)" }}>
            {user.email}
          </div>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10"
        style={{ color: "var(--sidebar-text)" }}
      >
        <LogOut size={15} />
        Çıkış Yap
      </button>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}
