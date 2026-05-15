"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard";

/**
 * Vim-style "g + harf" gezinme + sayfa içi 'n' (yeni).
 */
export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const lastG = useRef<number>(0);

  // Sayfa bağlamında "yeni" hedefi
  function newTarget(): string | null {
    if (pathname.startsWith("/uygulama/profiller")) return "/uygulama/profiller?yeni=1";
    if (pathname.startsWith("/uygulama/faturalar")) return "/uygulama/faturalar?yeni=1";
    if (pathname.startsWith("/uygulama/alacaklar")) return "/uygulama/alacaklar?yeni=1";
    if (pathname.startsWith("/uygulama/borclar")) return "/uygulama/borclar?yeni=1";
    if (pathname.startsWith("/uygulama/hatirlaticilar"))
      return "/uygulama/hatirlaticilar?yeni=1";
    if (pathname.startsWith("/uygulama/tekrarlayanlar"))
      return "/uygulama/tekrarlayanlar?yeni=1";
    if (pathname.startsWith("/uygulama/urunler")) return "/uygulama/urunler?yeni=1";
    if (pathname.startsWith("/uygulama/ayarlar/etiketler"))
      return "/uygulama/ayarlar/etiketler?yeni=1";
    return null;
  }

  // 'g' chord state
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Input içindeyken ignore
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          e.target.isContentEditable
        )
          return;
      }
      // Modifier ile kombinasyonları ignore (⌘K vs.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const now = Date.now();
      const isGActive = now - lastG.current < 1500;

      if (e.key === "g" && !isGActive) {
        lastG.current = now;
        return;
      }

      if (isGActive) {
        const targetByKey: Record<string, string> = {
          h: "/uygulama",
          p: "/uygulama/profiller",
          f: "/uygulama/faturalar",
          a: "/uygulama/alacaklar",
          b: "/uygulama/borclar",
          s: "/uygulama/ayarlar",
          u: "/uygulama/urunler",
          t: "/uygulama/tekrarlayanlar",
          r: "/uygulama/hatirlaticilar",
        };
        const target = targetByKey[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target);
          lastG.current = 0;
          return;
        }
        // 'g' ile başlamış ama bilinmeyen tuş → resetle
        lastG.current = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // 'n' — yeni kayıt
  useKeyboardShortcuts([
    {
      keys: "n",
      handler: () => {
        const target = newTarget();
        if (target) router.push(target);
      },
    },
  ]);

  return null;
}
