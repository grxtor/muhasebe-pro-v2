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

## 📦 Modüller (13)

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
| **Müzik Ödemeleri** 🆕 | ❌ | Müzik bazlı gelir/harcama/sanatçı ödemesi/net kâr — Borçlar+Kasa entegre |

> 🆕 Müzik modülü için **Sanatçı / Promoter / İşbirlikçi profilleri Profiller sayfasında** yaşar (Cari.tip=Harcama, harcamaTuru=Sanatci/Promoter/Isbirlikci). Promoter için niş/tier/takipçi metadata Cari'de kolon olarak tutulur.

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

## 🗺 Roadmap — Müzik & İçerik (MAXVARO)

MAXVARO Group için müzik label muhasebesi katmanı. Kağıt notlardan çıkarılan
2 yeni modül:

### 1. Promoter / Sanatçı / İşbirlikçi → Profiller'de
Ayrı bir "İçerik Üreticileri" sayfası **YOK**. Tüm bu profiller Cari
tablosunda yaşar:

- `Cari.tip = Harcama`
- `Cari.harcamaTuru ∈ { Sanatci, Promoter, Isbirlikci }`

Promoter için Cari'de ek kolonlar (sadece `harcamaTuru=Promoter` ise dolar):
- `promoterNiche` (`PromoterNiche` enum, 11 değer: Anime, Football, Movie,
  Formula1Car, UFCMMA, Trollface, DanceVideos, ModeClothes, Manga,
  TopBoySnowfall, HighImpactShatter)
- `promoterTier` (Low/Mid/High — kırmızı/mavi/yeşil)
- `promoterFollowers`, `promoterAvgViews`, `promoterPricePerVideo`
- `promoterHasInstagram`, `promoterHasTikTok`

> Profiller sayfasında tip filtresi `Sanatci/Promoter/Isbirlikci` ile bu
> profiller listelenir. CSV import Profiller sayfasından yapılır.

### 2. Müzik Ödemeleri (`/uygulama/muzik-odemeleri`)
Dağıttığın müzikler için izole gelir/harcama defteri.

- **MuzikProfil** = isim + sanatçılar (Cari M2M `MuzikProfilSanatci`) +
  işbirlikçiler (string[]) + mağazalar (`MuzikMagaza[]`) + notlar
- **3 kayıt türü** (her biri ayrı tablo + ayrı model):
  - **MuzikGelir** — tarih + tutar + (opsiyonel) `platform: MuzikMagaza` + not
  - **MuzikHarcama** — tarih + tutar + (opsiyonel) `kategori:
    MuzikHarcamaKategori` (Reklam/Tasarım/Prodüksiyon/Klip/Mix/Master/Telif/
    Diğer) + (opsiyonel) `promoterCariId` (Cari FK) + `kasaId` (Kasa FK) +
    `not` + **`borclaraYansit` toggle** (default ON)
  - **SanatciOdemesi** — tarih + `sanatciCariId` (Cari FK, harcamaTuru=Sanatci)
    + tutar + not (yüzde yok, manuel) + `borclaraYansit`
- **Net Kâr** = ΣGelir − ΣHarcama − ΣSanatçı Ödemesi (in-memory hesaplanır)
- **Liste sayfa**: kompakt **KPI strip** + müzik **tablosu** (Müzik /
  Mağazalar / Gelir / Harcama / Sanatçı / Net Kâr / Detay)
- **Detay sayfa**: `/uygulama/muzik-odemeleri/[slug]` — Üst meta + KPI strip
  + platform chip strip + 3 sekme tablo
- **Yeni Müzik dialog**: inline "İlk harcamalar (opsiyonel)" bölümü —
  birden fazla harcama tek formda eklenir, müzik create ile aynı
  transaction'da hepsi kaydedilir.

### Borçlar + Kasa köprüsü (otomatik)

Harcama veya sanatçı ödemesi create edildiğinde, `borclaraYansit=true`
ise aynı Prisma `$transaction` içinde:

1. `Hareket` (tip=Borc, cariId=promoter or sanatçı, tutar, tarih,
   aciklama="[müzik adı] · [kategori]")
2. `OdemeNotu` (yon=Borc, durum=Odendi, cariId, vade=tarih, tutar)
3. `KasaHareketi` (kasaId, tip=Cikis, tutar) — `kasaId` set edilmişse
4. `MuzikHarcama.hareketId / odemeNotuId / kasaHareketiId` FK'leri set
   edilir → delete cascade ile silinince muhasebe kayıtları da silinir

Detay sayfa tablo satırlarında **`Borçlar'da` badge** (warning rengi) ile
işaretlenir; tıklayınca ileride ilgili `OdemeNotu`'na yönlendirilebilir.

### Faz planı

| Faz | Kapsam | Durum |
|-----|--------|-------|
| **1 — Mockup** | UI iskeleti, mock data, sidebar + modül toggle, tüm dialog'lar; tablo bazlı liste; kompakt KPI strip; Borçlar köprüsü toggle; Kasa default seçim; inline harcama; İçerik Üreticileri sayfası kaldırıldı (Profiller'e taşındı) | ✅ Tamamlandı |
| **2a — Prisma schema migration** | `MuzikProfil`, `MuzikProfilSanatci`, `MuzikGelir`, `MuzikHarcama`, `SanatciOdemesi` modelleri; `PromoterNiche`, `PromoterTier`, `MuzikMagaza`, `MuzikHarcamaKategori` enum'ları; `HarcamaTuru`'na +Sanatci/+Promoter/+Isbirlikci; Cari'ye promoter kolonları; `Organization.modulMuzik`; tüm back-relation'lar | ✅ DB push OK |
| **2b — Server Actions + UI bağlama** | `muzik-odemeleri/actions.ts` (CRUD + Borçlar+Kasa transaction köprüsü); selector helper'lar (`listSanatcilarForSelect`, `listPromoterlarForSelect`, `listAktiveKasalarForSelect`); page'ler DB'ye bağlı (Decimal→Number serialize); 3 detay dialog'u + müzik dialog'u gerçek action'a bağlı; mock dosyaları silindi; Profiller dialog'una promoter metadata alanları + Sanatci/Promoter/Isbirlikci tipleri; profil-list `ProfilRow` genişledi; profiller/page `harcamaTuru` URL filtresi; ayarlar `modulMuzik` toggle backend bağlı; mevcut bug fix (distributor/ticaret/avans modül flag submit'i eksikti) | ✅ Tamamlandı |
| **3 — Mağaza geliri köprüsü** | Müzik geliri için opsiyonel `Alacak/Hareket` üretimi (kullanıcı onayıyla); CSV import (Profiller'de promoter); müzik profili edit dialog'u | ⏳ Sıradaki |
| **4 — Fatura / Stok iş kuralı sertleştirme** | Kağıttaki gelen/giden fatura akışı, e-irsaliye, stok ↔ borç mahsup | ⏳ Ayrı planlama |

### Yeni dosya/yapı

```
prisma/schema.prisma                            # +MuzikProfil/Sanatci(M2M)/Gelir/Harcama/SanatciOdemesi
                                                # +5 enum, Cari'ye promoter kolonları, Organization.modulMuzik
src/lib/enums.ts                                # +PromoterNiche/Tier/Magaza/HarcamaKategori
                                                # +HarcamaTuru.Sanatci/Promoter/Isbirlikci
src/lib/modules.ts                              # +muzik (ModuleKey + flags) — promoter modülü yok
src/lib/module-guard.ts                         # modulMuzik dahil tüm flag select
src/lib/schemas/profil.ts                       # +promoter metadata field'ları
src/lib/schemas/muzik.ts                        # Yeni: 4 Zod schema + slugify helper
src/app/uygulama/_components/app-shell.tsx      # "Müzik & İçerik" sidebar grubu (tek item)
src/app/uygulama/ayarlar/actions.ts             # modulSchema + updateModuller +modulMuzik
src/app/uygulama/ayarlar/moduller/page.tsx      # stats objesi +muzik
src/app/uygulama/ayarlar/moduller/moduller-form.tsx  # MODULE_ICONS +muzik; submit'te
                                                # +modulDistributor/Ticaret/Avans/Muzik (mevcut bug fix)
src/app/uygulama/profiller/
   ├── page.tsx                                 # +harcamaTuru URL filtresi; +promoter alanları serialize
   ├── actions.ts                               # create/update +promoter payload (sadece Promoter ise)
   ├── profil-list.tsx                          # ProfilRow tipi +promoter metadata
   └── profil-dialog.tsx                        # +Sanatci/Promoter/Isbirlikci enum option'ları;
                                                # +Promoter metadata kartı (niş/tier/takipçi/IG/TT)
src/app/uygulama/muzik-odemeleri/
   ├── page.tsx                                 # Server: db.muzikProfil.findMany + özet hesabı
   ├── actions.ts                               # CRUD + Borçlar+Kasa transaction köprüsü
   │                                            # + listSanatcilar/Promoterlar/Kasalar selector'ları
   ├── muzik-list.tsx                           # Tablo + kompakt KPI strip + arama (DB bağlı)
   ├── muzik-dialog.tsx                         # Yeni müzik — Cari sanatçı select + inline harcama
   ├── _stat-strip.tsx                          # Kompakt yatay KPI şerit (reusable)
   └── [slug]/
       ├── page.tsx                             # Server: muzikProfil + 3 child + Decimal→Number
       ├── muzik-detail.tsx                     # Üst meta + 4 KPI + platform kırılım + 3 tab
       │                                        # + Borçlar'da badge + delete confirm
       ├── gelir-dialog.tsx                     # createMuzikGelir action
       ├── harcama-dialog.tsx                   # createMuzikHarcama (+Promoter+Kasa+Borçlar toggle)
       └── sanatci-odemesi-dialog.tsx           # createSanatciOdemesi (+Kasa+Borçlar toggle)
```

### Dialog pattern — `setState-in-effect` yasağı

React 19 + Next 16 lint kuralı: useEffect içinde direkt `setState()` yasak.
**Tüm yeni dialog'lar iki katmanlıdır:**

```tsx
export function FooDialog({ open, onClose, editing }: Props) {
  if (!open) return null;
  return <FooDialogInner onClose={onClose} editing={editing} />;
}

function FooDialogInner({ ... }) {
  const [form, setForm] = useState<FormState>(() => initialForm(editing));
  // ... useEffect yok, mount/unmount ile reset
}
```

Outer wrapper open prop'una göre mount/unmount eder; iç bileşen useState lazy
initializer ile başlar. State reset otomatik (her açılış = yeni mount).

### Müzik harcaması transaction flow (uygulandı)

`src/app/uygulama/muzik-odemeleri/actions.ts:harcamaIcinKopruIle()`:

```ts
await db.$transaction(async (tx) => {
  // 1. Cari belirle (promoter yoksa "MUZ-SISTEM" kodlu sistem carisi)
  const cariId = promoterCariId ?? (await ensureSistemMuzikCarisi(tx, ...)).id;

  // 2. Hareket (Borc)
  const hareket = await tx.hareket.create({ tip: "Borc", cariId, ... });

  // 3. OdemeNotu (Borc, Odendi)
  const odemeNotu = await tx.odemeNotu.create({
    yon: "Borc", durum: "Odendi", odenenTutar, odemeTarihi, ...
  });

  // 4. KasaHareketi (opsiyonel, kasaId varsa)
  const kasaH = kasaId ? await tx.kasaHareketi.create({ tip: "Cikis", ... }) : null;

  // 5. MuzikHarcama + köprü FK'leri
  await tx.muzikHarcama.create({
    ..., hareketId, odemeNotuId, kasaHareketiId
  });
});
```

`SanatciOdemesi` aynı pattern — promoter yerine `sanatciCariId` direkt
Cari'den gelir.

### Delete davranışı

`deleteMuzikHarcama` ve `deleteSanatciOdemesi` köprü kayıtlarını da temizler:

```ts
await db.$transaction(async (tx) => {
  if (h.hareketId) await tx.hareket.delete({ where: { id: h.hareketId } }).catch(() => {});
  if (h.odemeNotuId) await tx.odemeNotu.delete({ where: { id: h.odemeNotuId } }).catch(() => {});
  if (h.kasaHareketiId) await tx.kasaHareketi.delete({ where: { id: h.kasaHareketiId } }).catch(() => {});
  await tx.muzikHarcama.delete({ where: { id } });
});
```

(Schema'da köprüler `onDelete: SetNull`, cascade değil — manuel temizleniyor.)

### Faz 3 checklist (sıradaki)

1. Müzik geliri için opsiyonel `Alacak/Hareket` üretimi — dialog'a
   "Alacaklar'a da kaydet" toggle, transaction içinde `OdemeNotu(Alacak)`
   + `Hareket(Alacak)` create
2. Müzik profili edit dialog'u (şu an sadece create — update için ayrı
   action ve UI)
3. CSV import için Profiller (Promoter satırları niş/tier/takipçi
   kolonlarıyla tanınır, `xlsx` ile parse + Zod doğrulama)
4. `module-guard.ts` zaten modulMuzik dahil — diğer modüller (distributor/
   ticaret/avans/kdvBeyan) için de runtime guard eksik, ekle
5. Yetersiz kasa bakiyesi uyarısı (harcama dialog'da seçili kasanın
   bakiyesi gösteriliyor — pre-check ekle)

---

## 📞 Hızlı Referans

- **Repo**: https://github.com/grxtor/muhasebe-pro-v2
- **Web**: https://muhasebe.oceanyazilim.com
- **Dokploy**: https://panel.oceanyazilim.com
- **Owner**: `abdullah.huseyin.efe@outlook.com`
- **Mevcut sürüm**: v1.1.0

— bu dosya her büyük değişiklikten sonra güncellenir
