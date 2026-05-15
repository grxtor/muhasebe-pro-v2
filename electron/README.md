# Muhasebe Pro — Masaüstü Uygulaması (Electron)

Bu klasör, Muhasebe Pro v2'nin masaüstü (macOS / Windows / Linux) uygulamasının kaynak kodunu içerir.

## Mimari

Electron app, **wrapper** yaklaşımıyla çalışır:

- **Production'da**: `https://muhasebe.oceanyazilim.com` adresini açar (veya `APP_URL` env'i set edilirse o adresi).
- **Dev'de**: `http://localhost:3000` üzerinde çalışan Next.js dev server'a bağlanır.
- **Offline durumda**: `offline.html` ekranı gösterilir; internet geri gelince otomatik yeniden bağlanır.

Yani veritabanı ve server-side mantığı remote'da kalır; Electron sadece native bir kabuk sağlar — App Store benzeri kurulum, taskbar/dock ikonu, native menü, sistem tema entegrasyonu.

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `main.ts` | Electron main process — BrowserWindow oluşturur, menüyü, IPC'yi, offline detection'ı yönetir |
| `preload.ts` | Render process'e güvenli IPC API'si (window.muhasebePro.reload(), getAppUrl(), isOnline()) |
| `offline.html` | İnternet yokken gösterilen statik HTML — otomatik yeniden deneme |
| `tsconfig.json` | Electron için TS config (CommonJS, Node target) |
| `icons/` | Uygulama ikonları (1024/512/256/.../16 px PNG'ler) |
| `scripts/make-icon.mjs` | `public/icons/icon.svg`'den PNG ikonları üretir |

## Komutlar

```bash
# Geliştirme — Next.js + Electron paralel
pnpm electron:dev

# TypeScript derle (electron/ → dist-electron/)
pnpm electron:build

# Production wrapper'ı remote URL ile çalıştır
pnpm electron:start

# macOS .dmg üret (arm64 + x64)
pnpm electron:mac

# Windows .exe üret
pnpm electron:win

# Linux .AppImage üret
pnpm electron:linux

# Hepsini üret
pnpm electron:all

# Sadece pakete (dağıtım için değil, test için)
pnpm electron:pack
```

Çıktı dizini: `release/`

## İkonları Yenile

`public/icons/icon.svg`'yi değiştirdikten sonra:

```bash
node electron/scripts/make-icon.mjs
```

## Notlar

- **Code signing**: Şu an `identity: null` ve `hardenedRuntime: true`. macOS Gatekeeper uyaracaktır
  (System Settings → Privacy & Security → "Open Anyway"). Resmi imza için Apple Developer hesabı ve
  `CSC_LINK` + `CSC_KEY_PASSWORD` env vars gerekir.
- **Notarization**: Mac App Store dışı dağıtım için `notarize: true` + Apple ID lazım.
- **Auto-update**: `electron-updater` ile eklenebilir; şu an publish: null.

## İleride — Tam Offline-First

Şu anki yapı **read-only offline**'a kadar uzanabilir (Service Worker cache + IndexedDB).
Yazma operasyonları için tam offline destek **büyük rewrite** gerektirir:

- Prisma yerine local SQLite (better-sqlite3 / PGlite)
- Sync engine (CRDT veya operational transform)
- Background write queue
- Conflict resolution

Bu paket halen pratik bir desktop wrapper olarak işlevini görür; internet açıkken tam fonksiyonel.
