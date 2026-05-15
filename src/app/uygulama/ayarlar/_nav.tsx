"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User as UserIcon,
  Building2,
  Palette,
  Bell,
  Tags,
  History,
  ToggleRight,
} from "lucide-react";

const items = [
  { href: "/uygulama/ayarlar", label: "Profil", icon: UserIcon, exact: true },
  { href: "/uygulama/ayarlar/sirket", label: "Şirket Bilgileri", icon: Building2 },
  { href: "/uygulama/ayarlar/moduller", label: "Modüller", icon: ToggleRight },
  { href: "/uygulama/ayarlar/gorunum", label: "Görünüm", icon: Palette },
  { href: "/uygulama/ayarlar/bildirim", label: "Bildirimler", icon: Bell },
  { href: "/uygulama/ayarlar/etiketler", label: "Etiketler", icon: Tags },
  { href: "/uygulama/ayarlar/aktivite", label: "Aktivite Geçmişi", icon: History },
];

export function AyarlarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: active ? "var(--surface-muted)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              fontWeight: active ? 500 : 400,
            }}
          >
            <Icon size={15} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
