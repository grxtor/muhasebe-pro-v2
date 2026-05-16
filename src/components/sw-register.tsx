"use client";

import { useEffect } from "react";

/**
 * Service Worker register.
 * - Production'da kayıt
 * - Dev'de SW yok (Next dev server zaten cache yapmaz)
 * - Auth-protected sayfalarda da çalışır (credentials default include)
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        // Yeni SW geldiyse aktif et
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Yeni SW hazır — sessizce devreye alınmasını bekle
              console.info("[sw] yeni sürüm aktif olacak");
            }
          });
        });
      } catch (err) {
        console.warn("[sw] register başarısız:", err);
      }
    };

    void register();
  }, []);

  return null;
}

/**
 * Server Action sonrası SW cache'i invalidate etmek için yardımcı.
 * Mutation yapan formlardan çağrılabilir.
 */
export function invalidateServiceWorkerPages(): void {
  if (typeof navigator === "undefined") return;
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_PAGES" });
}
