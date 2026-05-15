"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

/**
 * Uygulama genel sağlayıcıları.
 *
 * HeroUI v3 NOTU: v3'te `HeroUIProvider` YOKTUR. Stiller `globals.css` içinden
 * `@import "@heroui/styles"` ile yüklenir. Sadece tema (light/dark) ve toast
 * sağlayıcılarına ihtiyacımız var.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute={["class", "data-theme"]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </NextThemesProvider>
  );
}
