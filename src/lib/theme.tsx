"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "muhasebe-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyDom(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

/**
 * Hafif, next-themes'siz tema yönetimi.
 *
 * Flash-of-unstyled-theme önlemek için layout.tsx head'inde
 * dangerouslySetInnerHTML ile inline script çalıştırıyoruz; o script
 * React hydration'dan ÖNCE `.dark` class'ını ekliyor.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored =
      (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);

    const resolve = (t: Theme): ResolvedTheme =>
      t === "system" ? getSystemTheme() : t;

    setResolvedTheme(resolve(stored));
    setMounted(true);

    // Sistem teması değişirse `system` modunda otomatik takip et
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current =
        (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
      if (current === "system") {
        const r = resolve(current);
        setResolvedTheme(r);
        applyDom(r);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    const r: ResolvedTheme = t === "system" ? getSystemTheme() : t;
    setResolvedTheme(r);
    applyDom(r);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme, mounted }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provider dışı kullanıma karşı güvenli fallback
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
      mounted: false,
    };
  }
  return ctx;
}

/**
 * Inline script — `<head>`e dangerouslySetInnerHTML ile basılır,
 * hydration'dan önce class'ı setler. Flash önler, React script-tag
 * uyarısı vermez (çünkü innerHTML olarak konuyor, JSX <script> değil).
 */
export const themeBootstrapScript = `
(function(){try{
  var k='${STORAGE_KEY}';
  var s=localStorage.getItem(k);
  var t=s||'system';
  var d=t==='dark'||((t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var r=document.documentElement;
  if(d){r.classList.add('dark');r.setAttribute('data-theme','dark');r.style.colorScheme='dark';}
  else{r.setAttribute('data-theme','light');r.style.colorScheme='light';}
}catch(e){}})();
`.trim();
