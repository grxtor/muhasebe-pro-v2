<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Ajan Kuralları — Müzik & İçerik modülleri (Faz 1 sonrası)

### ⚠️ React 19 + Next 16 lint kuralı

`react-hooks/set-state-in-effect` — `useEffect` içinde direkt `setState()`
çağrısı **error** verir. Dialog'larda form reset için outer/inner pattern
kullan:

```tsx
export function FooDialog({ open, ...props }) {
  if (!open) return null;
  return <FooDialogInner {...props} />;
}

function FooDialogInner(props) {
  const [form, setForm] = useState<FormState>(() => initialFrom(props));
  // useEffect ile reset YAPMA
}
```

DataModal `isOpen={true}` hard-coded olabilir çünkü outer wrapper zaten
açıklığı kontrol ediyor.

### ⚠️ JSX apostrof

`Tier'lar`, `promoter'ı`, `Faz 2'de`, `Hareketler'e` gibi metinlerde
`react/no-unescaped-entities` error verir. **`&apos;`** kullan.

### Yeni modül eklerken sırayla

1. `prisma/schema.prisma` — model + enum
2. `pnpm prisma db push` (kullanıcı çalıştırır)
3. `src/lib/enums.ts` — TR etiketleri
4. `src/lib/modules.ts` — `ModuleKey`, `OPTIONAL_MODULES`, `ModuleFlags`,
   `DEFAULT_MODULES`, `readModuleFlags` (5 yer)
5. `src/app/uygulama/ayarlar/actions.ts` — `modulSchema` + `updateModuller`
   for döngüsüne yeni key ekle
6. `src/app/uygulama/ayarlar/moduller/moduller-form.tsx` — MODULE_ICONS +
   submit fonksiyonunda `if (state.X) fd.set("modulX", "true")`
7. `src/app/uygulama/ayarlar/moduller/page.tsx` — stats objesinde yeni key
8. `src/app/uygulama/_components/app-shell.tsx` — `buildNavGroups` içinde
   uygun gruba item ekle (icon import et)
9. `src/app/uygulama/<modul>/page.tsx + *-list.tsx + *-dialog.tsx + actions.ts`
10. `pnpm exec tsc --noEmit` + `pnpm exec eslint src/app/uygulama/<modul>`

### Mockup dosyaları (Faz 2'de silinecek/değiştirilecek)

- `src/app/uygulama/icerik-ureticileri/_mock.ts` — 11 fake promoter
- `src/app/uygulama/muzik-profilleri/_mock.ts` — 3 fake müzik profili
   + `muzikOzeti()` helper
- Tüm dialog'ların `setTimeout(... 400)` mockup save → gerçek server action

### Müzik & Promoter — Faz 2 schema prensipleri (uygulandı)

- **Promoter ayrı model değil** — `Cari` tablosunda `tip=Harcama`,
  `harcamaTuru=Promoter` + Cari'deki niş/tier/takipçi/IG/TT kolonları.
- **Sanatçı / İşbirlikçi** de aynı şekilde Cari'de yaşar
  (`harcamaTuru=Sanatci` / `Isbirlikci`). Ayrı tablo YOK.
- **MuzikProfil ↔ Sanatçı** M2M: `MuzikProfilSanatci` ara tablosu, `cariId`
  FK'siyle. Yüzde alanı **YOK** — ödemeler manuel `SanatciOdemesi` kaydı.
- **MuzikHarcama** create transaction (eğer `borclaraYansit=true`):
  ```
  await db.$transaction(async (tx) => {
    const hareket = await tx.hareket.create({...});
    const odemeNotu = await tx.odemeNotu.create({...});
    const kasaHareketi = kasaId
      ? await tx.kasaHareketi.create({...})
      : null;
    return tx.muzikHarcama.create({
      ...,
      hareketId: hareket.id,
      odemeNotuId: odemeNotu.id,
      kasaHareketiId: kasaHareketi?.id ?? null,
    });
  });
  ```
- **Müzik geliri** — şimdilik **muhasebeye yansımaz** (sadece müzik
  defterinde). Faz 3'te opsiyonel checkbox ile yansıtma eklenir.
- **Net kâr hesabı** view layer'da kalmalı (DB'de generated column değil);
  toplama maliyeti düşük, in-memory `reduce` yeterli.
- **Mock dosyalar** Faz 2b'de silindi. Kalan: `_stat-strip.tsx` reusable.
- **Selector helper'lar** `actions.ts` içinde: `listSanatcilarForSelect`,
  `listPromoterlarForSelect`, `listAktiveKasalarForSelect` — Cari ve Kasa
  tablolarından filtre ile çeker, client'tan async kullanılır.
- **Sistem cariye fallback**: `ensureSistemMuzikCarisi(tx, orgId, userId)` —
  `MUZ-SISTEM` kodlu Cari upsert; promoter seçilmeyen müzik harcamaları
  Borçlar'a düşerken bu cariye bağlanır.
- **Decimal serialize**: Prisma Decimal → `Number()` server→client geçişinde
  page.tsx'te serialize edilir, "Decimal serialization not supported" hatası
  yaşanmaz.
