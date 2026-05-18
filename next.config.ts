import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker standalone build (Dokploy için)
  output: "standalone",
  reactStrictMode: true,

  // Header'ları ve sürüm bilgisini gizle (mikro performans)
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Büyük paketleri tree-shake et — her sayfada tüm kütüphane bundle edilmesin
  // Bu, ilk yüklemeyi ÇOK ciddi şekilde hızlandırır (HeroUI/lucide tonlarca
  // ikon ve component'i her chunk'a sokuyordu).
  experimental: {
    optimizePackageImports: [
      "@heroui/react",
      "@heroui/styles",
      "lucide-react",
      "recharts",
      "date-fns",
      "sonner",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // 🚀 KRİTİK PERFORMANS — Router Cache
    // Discord tarzı "anında geri dönüş" deneyimi:
    // Bir sayfaya 30 sn içinde geri dönersen cache'den gösterilir (fetch yok).
    // Arkada otomatik revalidate ediliyor. Server Action sonrası
    // revalidatePath çağrılırsa invalidate olur.
    staleTimes: {
      // Dinamik route'lar (auth gerekli, force-dynamic): 30 sn
      // 30 sn içinde aynı sayfaya geri dönerken ağa hiç gidilmez.
      dynamic: 30,
      // Static route'lar: 5 dk (zaten az değişir)
      static: 300,
    },
  },

  // Cache-Control header'ları — Electron HTTP cache ve tarayıcı cache'i için.
  // DEV mode'da static asset cache'i devre dışı bırakılır, aksi takdirde
  // Turbopack HMR yeni chunk gelse bile tarayıcı eski immutable chunk'ı kullanır.
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      // Static asset'ler: prod'da 1 yıl immutable, dev'de no-store
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isDev
              ? "no-store, must-revalidate"
              : "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isDev ? "no-store" : "public, max-age=86400",
          },
        ],
      },
      // Uygulama route'ları: revalidate
      {
        source: "/((?!api|_next).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
