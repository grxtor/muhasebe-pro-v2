"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "@/lib/theme";
import { CommandPalette } from "@/components/ui/command-palette";
import { ShortcutsHelp } from "@/components/ui/shortcuts-help";
import { GlobalShortcuts } from "@/components/ui/global-shortcuts";
import { UpdateBanner } from "@/components/ui/update-banner";
import { modKeyLabel } from "@/lib/hooks/use-keyboard";
import { useIsMacElectron } from "@/lib/hooks/use-electron";
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
  Bell,
  Repeat,
  Package,
  Settings,
  UsersRound,
  Search,
  FileText,
  Wallet,
  Calculator,
  BarChart3,
  HandCoins,
  LineChart,
  Music,
} from "lucide-react";
import { Button } from "@heroui/react";

import type { ModuleFlags } from "@/lib/modules";
import type { OrgRole } from "@/lib/org";

interface AppShellProps {
  user: { name: string; email: string; image: string | null };
  moduller: ModuleFlags;
  org: { id: string; ad: string; role: OrgRole };
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Aktif modüllere göre nav grupları üretir.
 * Çekirdek (Anasayfa/Alacaklar/Borçlar/Profiller/Ayarlar) her zaman gelir.
 */
function buildNavGroups(moduller: ModuleFlags, role: OrgRole): NavGroup[] {
  const muhasebe: NavItem[] = [
    { href: "/uygulama/alacaklar", label: "Gelirler", icon: TrendingDown },
    { href: "/uygulama/borclar", label: "Ödemeler", icon: TrendingUp },
  ];
  if (moduller.faturalar) {
    muhasebe.push({
      href: "/uygulama/faturalar",
      label: "Faturalar",
      icon: Receipt,
    });
  }
  if (moduller.hareketler) {
    muhasebe.push({
      href: "/uygulama/hareketler",
      label: "Hareketler",
      icon: ListOrdered,
    });
  }
  if (moduller.cekSenet) {
    muhasebe.push({
      href: "/uygulama/cek-senet",
      label: "Çek / Senet",
      icon: FileText,
    });
  }
  if (moduller.kasa) {
    muhasebe.push({
      href: "/uygulama/kasa",
      label: "Kasa",
      icon: Wallet,
    });
  }
  if (moduller.kdvBeyan) {
    muhasebe.push({
      href: "/uygulama/kdv-beyan",
      label: "KDV Beyan",
      icon: Calculator,
    });
  }
  if (moduller.distributor) {
    muhasebe.push({
      href: "/uygulama/distributor",
      label: "Distribütör",
      icon: BarChart3,
    });
  }
  if (moduller.ticaret) {
    muhasebe.push({
      href: "/uygulama/ticaret",
      label: "Ticaret",
      icon: LineChart,
    });
  }
  if (moduller.avans) {
    muhasebe.push({
      href: "/uygulama/avans",
      label: "Avans",
      icon: HandCoins,
    });
  }

  const kayitlar: NavItem[] = [
    { href: "/uygulama/profiller", label: "Profiller", icon: Users },
  ];
  if (moduller.urunler) {
    kayitlar.push({
      href: "/uygulama/urunler",
      label: "Ürünler / Stok",
      icon: Package,
    });
  }
  if (moduller.tekrarlayanlar) {
    kayitlar.push({
      href: "/uygulama/tekrarlayanlar",
      label: "Tekrarlayan Kayıtlar",
      icon: Repeat,
    });
  }

  const muzikIcerik: NavItem[] = [];
  if (moduller.muzik) {
    muzikIcerik.push({
      href: "/uygulama/muzik-odemeleri",
      label: "Müzik Ödemeleri",
      icon: Music,
    });
  }

  const kisisel: NavItem[] = [];
  if (moduller.hatirlaticilar) {
    kisisel.push({
      href: "/uygulama/hatirlaticilar",
      label: "Hatırlatıcılar",
      icon: Bell,
    });
  }
  if (role === "Owner" || role === "Admin") {
    kisisel.push({
      href: "/uygulama/ayarlar/ekibim",
      label: "Ekibim",
      icon: UsersRound,
    });
  }
  kisisel.push({
    href: "/uygulama/ayarlar",
    label: "Ayarlar",
    icon: Settings,
  });

  return [
    {
      items: [
        { href: "/uygulama", label: "Anasayfa", icon: Home, exact: true },
      ],
    },
    { label: "Muhasebe", items: muhasebe },
    { label: "Kayıtlar", items: kayitlar },
    ...(muzikIcerik.length
      ? [{ label: "Müzik & İçerik", items: muzikIcerik }]
      : []),
    { label: "Kişisel", items: kisisel },
  ];
}

export function AppShell({ user, moduller, org, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, toggleTheme, mounted } = useTheme();
  const isMacElectron = useIsMacElectron();

  const navGroups = buildNavGroups(moduller, org.role);

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
        {/* macOS Electron'da pencere kontrolleri için drag region */}
        {isMacElectron && (
          <div
            className="h-7 shrink-0"
            style={{
              ["WebkitAppRegion" as never]: "drag",
            } as React.CSSProperties}
            aria-hidden
          />
        )}
        <div
          className="flex h-14 items-center gap-2 border-b border-white/5 px-5 text-base font-semibold tracking-tight"
          style={{
            color: "var(--sidebar-text-strong)",
            ...(isMacElectron
              ? ({ ["WebkitAppRegion" as never]: "drag" } as React.CSSProperties)
              : {}),
          }}
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-md text-sm"
            style={{
              background: "var(--sidebar-bg-2)",
              color: "var(--sidebar-text-strong)",
            }}
          >
            ₺
          </span>
          Muhasebe Pro
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-soft)" }}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={isActive(item.href, item.exact)}
                />
              ))}
            </div>
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
                  className="grid size-7 place-items-center rounded-md text-sm"
                  style={{
                    background: "var(--sidebar-bg-2)",
                    color: "var(--sidebar-text-strong)",
                  }}
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
            <nav className="flex-1 space-y-4 overflow-y-auto p-3">
              {navGroups.map((group, gi) => (
                <div key={gi} className="space-y-0.5">
                  {group.label && (
                    <div
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {group.label}
                    </div>
                  )}
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      {...item}
                      active={isActive(item.href, item.exact)}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
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
        {/* macOS Electron — topbar üstüne drag region */}
        {isMacElectron && (
          <div
            className="h-7 shrink-0 border-b"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              ["WebkitAppRegion" as never]: "drag",
            } as React.CSSProperties}
            aria-hidden
          />
        )}
        {/* Otomatik güncelleme banner (yalnızca Electron'da) */}
        <UpdateBanner />
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
            {/* Komut paleti tetikleyici — masaüstünde görünür */}
            <button
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    ctrlKey: true,
                  }),
                );
              }}
              className="hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-black/[0.02] md:flex dark:hover:bg-white/[0.03]"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text-muted)",
              }}
              aria-label="Komut paleti"
            >
              <Search size={13} />
              <span>Ara veya komut</span>
              <span className="flex items-center gap-0.5">
                <kbd
                  className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1 font-mono text-[10px]"
                  style={{
                    background: "var(--surface-muted)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {modKeyLabel()}
                </kbd>
                <kbd
                  className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1 font-mono text-[10px]"
                  style={{
                    background: "var(--surface-muted)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  K
                </kbd>
              </span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={toggleTheme}
              aria-label="Temayı değiştir"
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )
              ) : (
                <span aria-hidden className="size-4" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* Klavye + Komut paleti */}
      <CommandPalette />
      <ShortcutsHelp />
      <GlobalShortcuts />
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
      // Agresif prefetch: hover'da link'i önceden yükler — tıklayınca anında geçiş
      prefetch={true}
      onMouseEnter={() => {
        // İlave preconnect: Router prefetch'i tetiklemek için
        // (Next.js zaten yapar ama mouse-enter'da hemen başlatmak için)
      }}
      className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        background: active ? "var(--sidebar-active-bg)" : "transparent",
        color: active ? "var(--sidebar-text-strong)" : "var(--sidebar-text)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full"
          style={{ background: "var(--sidebar-active-bar)" }}
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
          className="grid size-8 place-items-center rounded-full text-xs font-semibold"
          style={{
            background: "var(--sidebar-bg-2)",
            color: "var(--sidebar-text-strong)",
          }}
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
