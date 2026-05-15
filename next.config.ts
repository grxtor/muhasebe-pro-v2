import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker standalone build (Dokploy için)
  output: "standalone",
  // Sıkı modu aç
  reactStrictMode: true,
  // Görsel optimizasyonu
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Server Actions için body limiti — dekont upload'larda gerekli olabilir
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
