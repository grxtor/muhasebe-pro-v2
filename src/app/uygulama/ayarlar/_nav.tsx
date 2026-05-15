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
  UsersRound,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  description: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Kişisel",
    description: "Sadece sen görürsün",
    items: [
      { href: "/uygulama/ayarlar", label: "Profil", icon: UserIcon, exact: true },
      { href: "/uygulama/ayarlar/gorunum", label: "Görünüm", icon: Palette },
      { href: "/uygulama/ayarlar/bildirim", label: "Bildirimler", icon: Bell },
    ],
  },
  {
    label: "Şirket",
    description: "Tüm üyeler için geçerli",
    items: [
      {
        href: "/uygulama/ayarlar/sirket",
        label: "Şirket Bilgileri",
        icon: Building2,
      },
      { href: "/uygulama/ayarlar/ekibim", label: "Ekibim", icon: UsersRound },
      {
        href: "/uygulama/ayarlar/moduller",
        label: "Modüller",
        icon: ToggleRight,
      },
      { href: "/uygulama/ayarlar/etiketler", label: "Etiketler", icon: Tags },
      {
        href: "/uygulama/ayarlar/aktivite",
        label: "Aktivite Geçmişi",
        icon: History,
      },
    ],
  },
];

export function AyarlarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-1 px-2">
            <div
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-soft)" }}
            >
              {group.label}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--text-soft)" }}
            >
              {group.description}
            </div>
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
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
                    background: active
                      ? "var(--surface-muted)"
                      : "transparent",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
