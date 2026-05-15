# Muhasebe Pro v2

Çok kullanıcılı, modern web ve masaüstü muhasebe uygulaması.
Next.js 16 + TypeScript + HeroUI v3 + Prisma + Auth.js v5.

> **Not:** Bu, eski Blazor sürümünün (`muhasebe-web`) yerine geçecek **tam yeniden yazımdır**. Eski sürüm `muhasebe-blazor-legacy` olarak arşivlenecek.

---

## Tech Stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Dil | TypeScript strict |
| Paket yöneticisi | pnpm 10 |
| UI | HeroUI v3 + Tailwind CSS v4 |
| Stil tokenları | OKLCH renkler, custom design system |
| İkon | lucide-react |
| Tema | next-themes (light/dark/system) |
| DB | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | Auth.js v5 — Email/şifre + Google OAuth, JWT session |
| Form | Server Actions + Zod validation |
| Bildirim | Sonner |
| Grafik | Recharts |
| Tarih | date-fns + Intl |
| i18n | next-intl (şimdilik TR-only) |
| PWA | Manifest + ikonlar (hem web hem Windows kurulabilir) |
| Deploy | Docker multi-stage + Dokploy uyumlu |

---

## Yerel Çalıştırma

### 1. Bağımlılıklar
```bash
pnpm install
```

### 2. Ortam değişkenleri
`.env.example`'ı kopyala ve doldur:
```bash
cp .env.example .env.local
openssl rand -base64 32  # AUTH_SECRET için kullan
```

Gerekli minimum:
- `DATABASE_URL` — PostgreSQL bağlantısı
- `AUTH_SECRET` — herhangi bir 32+ karakter rastgele string
- `AUTH_TRUST_HOST=true` — Dokploy/Traefik arkasında çalışırken
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — opsiyonel, Google girişi için

### 3. Veritabanı
```bash
pnpm db:push    # geliştirme için (migration olmadan şema senkronize)
# veya
pnpm db:migrate # production yolu (migration dosyaları üretir)
```

### 4. Dev sunucusu
```bash
pnpm dev
```

`http://localhost:3000` → `/kayit` → kayıt ol → `/uygulama` ile başla.

---

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Turbopack dev sunucu |
| `pnpm build` | Production build (Prisma generate dahil) |
| `pnpm start` | Production sunucu |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Prisma client üret |
| `pnpm db:push` | Schema'yı DB'ye uygula (migration yok) |
| `pnpm db:migrate` | Yeni migration üret + uygula |
| `pnpm db:studio` | Prisma Studio (DB tarayıcısı) |

---

## Docker

### Local test
```bash
docker compose up -d
# http://localhost:3000
```

### Dokploy
1. **Application** olarak repoyu bağla
2. Build Type: `Dockerfile`
3. Environment Variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true`
   - `AUTH_URL=https://senin-domain.com`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
4. Domains: `muhasebe.oceanyazilim.com` → port 3000
5. Healthcheck: `/api/health`

---

## Proje Yapısı

```
src/
├── app/
│   ├── (auth)/              # Auth route grubu
│   │   ├── giris/
│   │   ├── kayit/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── health/route.ts
│   ├── uygulama/            # Korunan alan
│   │   ├── _components/app-shell.tsx
│   │   ├── layout.tsx       # auth() kontrolü + AppShell
│   │   └── page.tsx
│   ├── globals.css          # Tailwind + HeroUI + tokens
│   ├── layout.tsx           # Root layout (TR, fonts, Providers)
│   ├── page.tsx             # Landing
│   └── providers.tsx        # next-themes + Sonner
├── components/
│   └── ui/
│       └── link-button.tsx
├── lib/
│   ├── db.ts                # Prisma singleton
│   ├── enums.ts             # Domain enums + TR etiketler
│   └── format.ts            # Para/tarih/vade biçimlendirme
├── i18n/
│   └── request.ts           # next-intl config
├── auth.config.ts           # Edge-safe Auth config
├── auth.ts                  # Tam Auth config (Prisma + bcrypt)
└── proxy.ts                 # Auth middleware (Next.js 16 proxy)

prisma/
└── schema.prisma            # DB şeması

messages/
└── tr.json                  # i18n metinleri

public/
├── icons/icon.svg
└── manifest.webmanifest     # PWA
```

---

## Sprint Yol Haritası

- [x] **Sprint 1 — Foundation** (Hafta 1)
  - Next.js + HeroUI + Auth + Prisma + i18n + PWA + app shell + deploy
- [ ] **Sprint 2 — Core CRUD** (Hafta 2)
  - Profiller, Faturalar (KDV otomatik), Alacaklar/Borçlar, Hareketler
- [ ] **Sprint 3 — Dashboard + Polish** (Hafta 3)
  - KPI'lar, grafikler, komut paleti, profil 360, bulk action, mobil
- [ ] **Sprint 4 — Yeni özellikler + Launch** (Hafta 4)
  - PDF fatura, Excel export, dekont upload, vergi takvimi, çoklu para birimi
  - DNS switch, eski Blazor sürümü arşivlenir

---

## Lisans

© Ocean Yazılım — Tüm hakları saklıdır.
