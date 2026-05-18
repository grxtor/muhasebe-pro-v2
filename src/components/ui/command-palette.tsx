"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  TrendingDown,
  TrendingUp,
  Users,
  Receipt,
  ListOrdered,
  Bell,
  Repeat,
  Package,
  Settings,
  Plus,
  Building2,
  Tags,
  UsersRound,
  Palette,
  History,
  ToggleRight,
  FileText,
  Wallet,
  Calculator,
  BarChart3,
  HandCoins,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { useKeyboardShortcut, modKeyLabel } from "@/lib/hooks/use-keyboard";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  keywords?: string[];
  action: () => void;
  group: "Hızlı Eylem" | "Sayfalar" | "Ayarlar";
}

interface Props {
  /** Profiller, faturalar gibi dinamik veri için (opsiyonel) */
  cariler?: Array<{ id: number; kod: string; unvan: string }>;
}

export function CommandPalette({ cariler = [] }: Props) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ⌘K — palet aç/kapat
  useKeyboardShortcut({
    keys: "mod+k",
    allowInInput: true,
    handler: () => setOpen((v) => !v),
  });

  // / — palet aç (input'lar dışında)
  useKeyboardShortcut({
    keys: "/",
    handler: () => setOpen(true),
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const go = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
    },
    [router],
  );

  const items: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      // Hızlı eylemler (en üstte)
      {
        id: "yeni-profil",
        label: "Yeni Profil",
        description: "Müşteri veya tedarikçi ekle",
        icon: Plus,
        keywords: ["müşteri", "tedarikçi", "cari"],
        action: () => go("/uygulama/profiller?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-fatura",
        label: "Yeni Fatura",
        description: "Gönderilen/gelen fatura kaydı",
        icon: Plus,
        keywords: ["invoice", "satış", "alış"],
        action: () => go("/uygulama/faturalar?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-alacak",
        label: "Yeni Alacak",
        description: "Tahsil edilecek tutar",
        icon: Plus,
        keywords: ["tahsilat", "gelir"],
        action: () => go("/uygulama/alacaklar?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-borc",
        label: "Yeni Borç",
        description: "Ödenecek tutar",
        icon: Plus,
        keywords: ["ödeme", "gider"],
        action: () => go("/uygulama/borclar?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-hatirlatici",
        label: "Yeni Hatırlatıcı",
        description: "Görev / hatırlatma",
        icon: Plus,
        keywords: ["görev", "todo"],
        action: () => go("/uygulama/hatirlaticilar?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-cek-senet",
        label: "Yeni Çek/Senet",
        description: "Alınan veya verilen çek/senet",
        icon: Plus,
        keywords: ["çek", "senet", "vade"],
        action: () => go("/uygulama/cek-senet?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-rapor",
        label: "Yeni Distribütör Raporu",
        description: "Spotify / YouTube CSV yükle",
        icon: Plus,
        keywords: ["distribütör", "spotify", "youtube", "csv", "rapor"],
        action: () => go("/uygulama/distributor?yeni=1"),
        group: "Hızlı Eylem",
      },
      {
        id: "yeni-kasa-hareketi",
        label: "Yeni Kasa Hareketi",
        description: "Giriş, çıkış veya transfer",
        icon: Plus,
        keywords: ["kasa", "para", "transfer", "tahsilat", "ödeme"],
        action: () => go("/uygulama/kasa?yeni=1"),
        group: "Hızlı Eylem",
      },
      // Sayfalar
      {
        id: "anasayfa",
        label: "Anasayfa",
        icon: Home,
        keywords: ["dashboard", "ana sayfa", "home"],
        action: () => go("/uygulama"),
        group: "Sayfalar",
      },
      {
        id: "alacaklar",
        label: "Gelirler",
        icon: TrendingDown,
        keywords: ["alacak", "tahsil", "gelir"],
        action: () => go("/uygulama/alacaklar"),
        group: "Sayfalar",
      },
      {
        id: "borclar",
        label: "Ödemeler",
        icon: TrendingUp,
        keywords: ["borç", "borc", "ödeme", "odeme"],
        action: () => go("/uygulama/borclar"),
        group: "Sayfalar",
      },
      {
        id: "profiller",
        label: "Profiller",
        icon: Users,
        keywords: ["müşteri", "tedarikçi", "cari"],
        action: () => go("/uygulama/profiller"),
        group: "Sayfalar",
      },
      {
        id: "faturalar",
        label: "Faturalar",
        icon: Receipt,
        keywords: ["invoice"],
        action: () => go("/uygulama/faturalar"),
        group: "Sayfalar",
      },
      {
        id: "hareketler",
        label: "Hareketler",
        icon: ListOrdered,
        keywords: ["transaction", "işlem"],
        action: () => go("/uygulama/hareketler"),
        group: "Sayfalar",
      },
      {
        id: "urunler",
        label: "Ürünler / Stok",
        icon: Package,
        keywords: ["product", "stok"],
        action: () => go("/uygulama/urunler"),
        group: "Sayfalar",
      },
      {
        id: "tekrarlayanlar",
        label: "Tekrarlayan Kayıtlar",
        icon: Repeat,
        keywords: ["kira", "abonelik"],
        action: () => go("/uygulama/tekrarlayanlar"),
        group: "Sayfalar",
      },
      {
        id: "hatirlaticilar",
        label: "Hatırlatıcılar",
        icon: Bell,
        keywords: ["görev"],
        action: () => go("/uygulama/hatirlaticilar"),
        group: "Sayfalar",
      },
      {
        id: "cek-senet",
        label: "Çek / Senet",
        icon: FileText,
        keywords: ["çek", "senet", "vade", "tahsil"],
        action: () => go("/uygulama/cek-senet"),
        group: "Sayfalar",
      },
      {
        id: "kasa",
        label: "Kasa",
        icon: Wallet,
        keywords: ["kasa", "para", "tl", "usd", "eur", "nakit"],
        action: () => go("/uygulama/kasa"),
        group: "Sayfalar",
      },
      {
        id: "distributor",
        label: "Distribütör Raporları",
        icon: BarChart3,
        keywords: ["distribütör", "spotify", "youtube", "apple music", "csv", "rapor"],
        action: () => go("/uygulama/distributor"),
        group: "Sayfalar",
      },
      {
        id: "kdv-beyan",
        label: "KDV Beyan",
        icon: Calculator,
        keywords: ["kdv", "vergi", "beyan", "tax", "aylık özet"],
        action: () => go("/uygulama/kdv-beyan"),
        group: "Sayfalar",
      },
      {
        id: "ticaret",
        label: "Ticaret",
        icon: LineChart,
        keywords: ["yatırım", "getiri", "kar", "alım", "satım", "kripto", "döviz"],
        action: () => go("/uygulama/ticaret"),
        group: "Sayfalar",
      },
      {
        id: "avans",
        label: "Avans",
        icon: HandCoins,
        keywords: ["avans", "geri ödeme", "borç verme", "ileri ödeme"],
        action: () => go("/uygulama/avans"),
        group: "Sayfalar",
      },
      // Ayarlar
      {
        id: "ayarlar",
        label: "Ayarlar",
        icon: Settings,
        action: () => go("/uygulama/ayarlar"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-sirket",
        label: "Şirket Bilgileri",
        icon: Building2,
        keywords: ["logo", "iban", "vergi"],
        action: () => go("/uygulama/ayarlar/sirket"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-ekibim",
        label: "Ekibim",
        icon: UsersRound,
        keywords: ["üye", "kullanıcı", "team"],
        action: () => go("/uygulama/ayarlar/ekibim"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-moduller",
        label: "Modüller",
        icon: ToggleRight,
        keywords: ["aç kapa"],
        action: () => go("/uygulama/ayarlar/moduller"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-etiketler",
        label: "Etiketler",
        icon: Tags,
        action: () => go("/uygulama/ayarlar/etiketler"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-gorunum",
        label: "Görünüm",
        icon: Palette,
        keywords: ["tema", "dark", "light"],
        action: () => go("/uygulama/ayarlar/gorunum"),
        group: "Ayarlar",
      },
      {
        id: "ayarlar-aktivite",
        label: "Aktivite Geçmişi",
        icon: History,
        keywords: ["audit", "log"],
        action: () => go("/uygulama/ayarlar/aktivite"),
        group: "Ayarlar",
      },
    ];

    // Profiller listesi (dinamik)
    const profilItems: CommandItem[] = cariler.slice(0, 30).map((c) => ({
      id: `profil-${c.id}`,
      label: c.unvan,
      description: c.kod,
      icon: Users,
      keywords: [c.kod, c.unvan],
      action: () => go(`/uygulama/profiller?duzenle=${c.id}`),
      group: "Sayfalar" as const,
    }));

    return [...base, ...profilItems];
  }, [cariler, go]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      const haystack = [
        item.label,
        item.description ?? "",
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  // Grup
  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Selected index düzenle
  useEffect(() => {
    if (selected >= filtered.length) setSelected(Math.max(0, filtered.length - 1));
  }, [filtered, selected]);

  // Selected'ı görüntüye getir
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selected]?.action();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Komut paleti"
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto p-4 pt-[15vh]"
    >
      <button
        aria-label="Kapat"
        className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative mx-auto h-fit w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
        onKeyDown={onKey}
      >
        <header
          className="flex items-center gap-2 border-b px-4"
          style={{ borderColor: "var(--border)" }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Sayfa, eylem, profil ara…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          <Kbd>Esc</Kbd>
        </header>

        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filtered.length === 0 && (
            <li
              className="px-4 py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Eşleşen sonuç yok
            </li>
          )}
          {groups.map(([groupName, groupItems]) => (
            <li key={groupName}>
              <div
                className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-soft)" }}
              >
                {groupName}
              </div>
              <ul>
                {groupItems.map((item) => {
                  const idx = filtered.indexOf(item);
                  const isActive = idx === selected;
                  const Icon = item.icon;
                  return (
                    <li key={item.id} data-cmd-index={idx}>
                      <button
                        type="button"
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelected(idx)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                        style={{
                          background: isActive
                            ? "var(--surface-muted)"
                            : "transparent",
                          color: "var(--text)",
                        }}
                      >
                        <Icon
                          size={15}
                          style={{ color: "var(--text-muted)" }}
                        />
                        <span className="flex-1">
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {item.description}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <Kbd>↵</Kbd>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <footer
          className="flex items-center justify-between border-t px-4 py-2 text-[11px]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-soft)",
            background: "var(--surface-muted)",
          }}
        >
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> gez
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> seç
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{modKeyLabel()}</Kbd>
            <Kbd>K</Kbd> aç/kapat
          </span>
        </footer>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1 font-mono text-[10px]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-strong)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </kbd>
  );
}
