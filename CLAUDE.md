@AGENTS.md

# Muhasebe Pro v2 — Proje Rehberi

Türkçe muhasebe SaaS. Web (Next.js) + Masaüstü (Electron) — multi-tenant, otomatik güncelleme, modül toggle sistemi. Bu dosya yeni Claude oturumları için tam referans.

---

## Stack

- **Framework**: Next.js **16.2.6** App Router (Turbopack, Server Actions, proxy.ts middleware rename)
- **React**: 19.2 (Server Components, useOptimistic, useActionState)
- **TypeScript**: strict mode, `any` YASAK
- **Auth**: Auth.js v5 beta (Credentials provider, JWT strategy, PrismaAdapter)
- **DB**: PostgreSQL @ `37.120.173.74:5432` (Hetzner Almanya, Dokploy yönetir)
- **ORM**: Prisma **6.19.3** — 7'ye GEÇMEYIN (`datasource url` config breaking change)
- **UI**: HeroUI v3 (compound, NO Provider, `onPress`) + Tailwind v4 (`@import "tailwindcss"`)
- **Charts**: recharts 3
- **Files**: xlsx (CSV/Excel), jspdf+jspdf-autotable (PDF)
- **Package**: **pnpm 10** (npm/yarn YASAK)
- **Desktop**: Electron 42 + electron-updater + custom Vencord-tarzı updater

---

## 🛑 Kritik Kurallar

| Kural | Neden |
|-------|-------|
| `pnpm` zorunlu | tek lockfile, npm/yarn ⇒ sil |
| `any` yasak | TS strict |
| HeroUI v3 | `onPress` (onClick değil), NO Provider, compound API |
| Tailwind v4 | `@import "tailwindcss"` + CSS vars |
| Türkçe metinler | UI + değişken isimleri (`cari`, `hareket`, `odemeNotu`) |
| Multi-tenant | Her domain tablosunda `organizationId` — `getOrgId()` ile scope'la |
| Server Actions | `"use server"` + `revalidatePath` + `logAction` (audit) |
| RBAC | `requireRole(OrgRole.Admin)` — Owner > Admin > Muhasebeci > Goruntuleyici |
| force-dynamic | Tüm /uygulama sayfaları auth cookies için zorunlu, kaldırma |

---

## 📂 Klasör Yapısı

```
muhasebe-pro-v2/
├── .github/workflows/electron-release.yml   # v* tag → mac/win/linux build
├── electron/                                # Masaüstü uygulama
│   ├── main.ts                              # Main process (custom updater + IPC)
│   ├── preload.ts                           # window.muhasebePro API
│   ├── offline.html
│   └── icons/
├── prisma/schema.prisma                     # Tüm modeller
├── public/sw.js                             # Service Worker (statik asset cache)
├── src/
│   ├── app/
│   │   ├── (auth)/giris kayit davet/[token]/
│   │   ├── uygulama/                        # Korunan alan
│   │   │   ├── _components/app-shell.tsx
│   │   │   ├── _lib/                        # OdemeNotu (Alacak/Borç) shared
│   │   │   ├── ayarlar/{profil,sirket,ekibim,moduller,masaustu,...}
│   │   │   ├── profiller/                   # Cari (Müşteri/Tedarikçi/Harcama)
│   │   │   ├── alacaklar borclar/
│   │   │   ├── faturalar hareketler/
│   │   │   ├── cek-senet kasa kdv-beyan/    # Modüller
│   │   │   ├── distributor ticaret avans/   # Yeni modüller
│   │   │   ├── urunler tekrarlayanlar hatirlaticilar/
│   │   │   ├── layout.tsx                   # ensureOrganization
│   │   │   └── loading.tsx                  # Global skeleton
│   │   ├── api/files/[...path]/             # Upload servis
│   │   └── layout.tsx providers.tsx
│   ├── components/ui/
│   │   ├── select.tsx                       # Custom Select (popover)
│   │   ├── date-input.tsx                   # Custom DatePicker (TR calendar)
│   │   ├── form-field.tsx                   # Wrapper (backward compat)
│   │   ├── data-modal.tsx command-palette.tsx
│   │   ├── update-banner.tsx                # Auto-updater UI
│   │   ├── bulk-action-bar.tsx dekont-list.tsx
│   ├── lib/
│   │   ├── db.ts auth.ts auth.config.ts proxy.ts
│   │   ├── auth-helpers.ts                  # getOrgContext/getOrgId/requireRole
│   │   ├── org.ts                           # ensureOrganization (lazy migration)
│   │   ├── modules.ts module-guard.ts       # 12 modül + flag'ler
│   │   ├── audit.ts files.ts dekont-actions.ts
│   │   ├── enums.ts                         # TÜM TR enum etiketleri
│   │   ├── format.ts                        # formatPara, formatTarih
│   │   ├── schemas/                         # Zod
│   │   └── hooks/                           # useBulkSelect, useKeyboard, useElectron, useUpdater
│   └── proxy.ts                             # Auth middleware
├── docker-compose.yml + Dockerfile
└── package.json (version + electron-builder config)
```

---

## 🗄 Önemli Modeller

```
Organization     # Tenant + modül flag'leri (modulFaturalar...modulAvans)
OrganizationMember (role: OrgRole)
Invitation       # 7 gün token (davet linki)
Cari             # tip: Musteri|Tedarikci|HerIkisi|Harcama
                 # harcamaTuru: Genel|Promosyon|Avans|Ticaret
OdemeNotu        # Alacak/Borç + detay JSON (Promosyon/Ticaret/Avans metadata)
Hareket          # Cash flow timeline
Fatura           # KDV + PDF + dekont
Dekont           # 4 hedef (fatura/odemeNotu/cari/hareket)
CekSenet Kasa KasaHareketi DistributorRapor
```

---

## 🚀 Deploy & Release

### Web — Dokploy
- Sunucu: Hetzner Almanya `37.120.173.74`
- Panel: https://panel.oceanyazilim.com
- App: https://muhasebe.oceanyazilim.com
- DB internal: `muhasebe-db-sqt04f:5432`
- Upload volume: `/var/dokploy-data/muhasebe-uploads` → `/app/uploads`
- Trigger: `git push origin main` → Dokploy auto-build

### Desktop — GitHub Actions
- Tag `vX.X.X` push → `.github/workflows/electron-release.yml`
- Build: macOS arm64 (.dmg + .zip), Windows x64 (.exe), Linux x64 (.AppImage)
- Custom Vencord-tarzı updater (`electron/main.ts`):
  - ZIP indir → `ditto` extract → bash script: eski .app sil + yeni yerleştir + relaunch
  - Squirrel.Mac'i bypass eder, **Apple Developer hesabı gerekmez**
- macOS imza: `identity: "-"` (ad-hoc), `hardenedRuntime: false`
- Polling: **1 dakika** + **focus event** anlık check (v1.0.9+)

### Release Komutu
```bash
# Version bump + push + tag
sed -i '' 's/"version": ".*"/"version": "1.X.X"/' package.json
git add package.json && git commit -m "release: vX.X.X" && git push origin main
git tag -a vX.X.X -m "vX.X.X" && git push origin vX.X.X
# ~5 dk: Actions release ZIP/DMG'yi yükler → açık app'ler banner gösterir
```

---

## 🛠 Komutlar

```bash
pnpm dev                    # Next.js dev (port 3000)
pnpm electron:dev           # Next + Electron paralel
pnpm build                  # Prisma generate + Next build
pnpm electron:build         # Electron TypeScript compile
pnpm electron:mac           # macOS arm64 .dmg (yerel test)
pnpm prisma db push         # Schema → DB (env yüklü olmalı)
pnpm prisma studio          # GUI

# Env yükleme (kritik):
set -a && source .env.local && set +a && pnpm exec tsc --noEmit
```

---

## 📦 Modüller (12)

| Modül | Default | Açıklama |
|-------|---------|----------|
| Faturalar | ✅ | Gönderilen/gelen, KDV, PDF |
| Hareketler | ✅ | Tahsilat/ödeme timeline |
| Tekrarlayan Kayıtlar | ✅ | Kira/abonelik şablonu |
| Hatırlatıcılar | ✅ | Görev listesi |
| Etiketler | ✅ | Renkli profil etiketleri |
| Ürünler/Stok | ❌ | Mal alıp satanlar |
| Çek/Senet | ❌ | Vade takibi |
| Kasa | ❌ | TL/USD/EUR + transfer |
| KDV Beyan | ❌ | Aylık otomatik |
| Distribütör | ❌ | Spotify/YouTube CSV |
| Ticaret | ❌ | Yatırım+getiri |
| Avans | ❌ | İleri tarihli ödemeler |

---

## 🎨 UI Pattern

```tsx
// HeroUI v3
<Button variant="primary" size="md" onPress={() => ...}>Kaydet</Button>

// Form alanları
<Field>
  <Label htmlFor="x" required hint="₺">Tutar</Label>
  <TextInput id="x" name="x" type="number" required />
</Field>

// Select (children parse edilir, custom popover render eder)
<Select name="tip" value={tip} onChange={(e) => setTip(e.target.value)}>
  <option value="A">A</option>
</Select>

// Date — type="date" → custom DateInput'a yönlenir
<TextInput type="date" name="vadeTarihi" defaultValue={isoStr} />
```

**Renkler — SADECE CSS vars (raw hex YASAK):**
- `var(--surface)`, `var(--surface-muted)`
- `var(--brand)`, `var(--accent)` (mavi)
- `var(--positive)`, `var(--negative)`, `var(--warning)`
- `var(--text)`, `var(--text-muted)`, `var(--text-soft)`
- `var(--border)`, `var(--border-strong)`

---

## ⌨️ Klavye Kısayolları

- **⌘K** veya **/** — Komut paleti
- **?** — Kısayol yardımı
- **g+h** anasayfa, **g+p** profiller, **g+f** faturalar, **g+a** alacaklar, **g+b** borçlar
- **n** — Bulunduğun sayfada yeni kayıt
- **Esc** — Toplu seçimi temizle

---

## 🔐 Güvenlik

- `.env.local` / `.env` **asla** commit'lenmez (`.gitignore`)
- Secret'lar Dokploy environment'tan gelir
- Auth.js JWT 30 gün, cookie + userData/Cookies SQLite
- Multi-tenant izolasyon **server action seviyesinde** — `getOrgId()` skip'i bug
- File upload: 10 MB limit, MIME whitelist
- Update binary: ad-hoc imzalı, Gatekeeper "Open Anyway" tek seferlik
- `xattr -cr` ile quarantine flag temizleme (Chrome'dan indirilen DMG'lerde)

---

## 🐛 Bilinen Tuzaklar

1. **Prisma 7 KULLANMA** — `datasource url` config breaking change
2. **`force-dynamic` zorunlu** — auth cookies için, `staleTimes` ile cache'le
3. **HeroUI server component'te `cn` import etme** — sadece `@heroui/styles`
4. **next-themes kullanma** — React 19'da script tag warning, `src/lib/theme.tsx` custom var
5. **macOS ad-hoc imza uyumsuzluğu** — Squirrel.Mac reject eder, **custom updater** bunu bypass ediyor
6. **GitHub DMG quarantine** — `xattr -cr ~/Downloads/X.dmg` ile temizle
7. **`"use server"` sync export YASAK** — type guard'ları başka dosyaya taşı
8. **pnpm symlink Docker build sorunu** — `.npmrc`: `node-linker=hoisted` zorunlu
9. **Service Worker HTML cache yapma** — React #418 hydration error (`v1.0.1`'de düzeltildi)
10. **AUTH_URL prod'da set olmalı** — yoksa davet linkleri localhost ile üretilir

---

## 📝 Yeni Feature Workflow

1. `prisma/schema.prisma` — şema değişikliği gerekirse
2. `pnpm prisma db push` + `generate`
3. `lib/enums.ts` — TR etiketler
4. `lib/schemas/` — Zod validator
5. `app/uygulama/<modul>/` — actions.ts + page.tsx + list.tsx + dialog.tsx
6. `lib/modules.ts` — yeni ModuleKey (opsiyonel modül)
7. `app-shell.tsx` — nav linki
8. `command-palette.tsx` — komut paleti entry
9. `pnpm exec tsc --noEmit` — type check
10. Commit + push + (gerekirse) tag at

---

## 📞 Hızlı Referans

- **Repo**: https://github.com/grxtor/muhasebe-pro-v2
- **Web**: https://muhasebe.oceanyazilim.com
- **Dokploy**: https://panel.oceanyazilim.com
- **Owner**: `abdullah.huseyin.efe@outlook.com`
- **Mevcut sürüm**: v1.0.9

— bu dosya her büyük değişiklikten sonra güncellenir
