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
  },

  // Cache-Control header'ları — Electron HTTP cache ve tarayıcı cache'i için
  async headers() {
    return [
      // Static asset'ler: 1 yıl cache, immutable
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
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
