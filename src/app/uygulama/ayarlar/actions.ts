"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { saveFile, deleteFile, FILE_LIMITS } from "@/lib/files";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ============================================================
   PROFİL
   ============================================================ */

const profilSchema = z.object({
  adSoyad: z.string().min(2).max(200),
  email: z.string().email().transform((e) => e.toLowerCase()),
});

export async function updateUserProfil(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = profilSchema.safeParse({
    adSoyad: formData.get("adSoyad"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  // Email değiştiyse benzersiz olmalı
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (current?.email !== parsed.data.email) {
    const exists = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (exists) return { ok: false, error: "Bu e-posta başkasına ait" };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      adSoyad: parsed.data.adSoyad,
      name: parsed.data.adSoyad,
      email: parsed.data.email,
    },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "User",
    entityId: userId,
    ozet: "Profil bilgileri güncellendi",
  });

  revalidatePath("/uygulama/ayarlar");
  return { ok: true };
}

const sifreSchema = z
  .object({
    mevcutSifre: z.string().min(6),
    yeniSifre: z.string().min(6, "Yeni şifre en az 6 karakter"),
    yeniSifreTekrar: z.string(),
  })
  .refine((d) => d.yeniSifre === d.yeniSifreTekrar, {
    path: ["yeniSifreTekrar"],
    message: "Şifreler eşleşmiyor",
  });

export async function updatePassword(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = sifreSchema.safeParse({
    mevcutSifre: formData.get("mevcutSifre"),
    yeniSifre: formData.get("yeniSifre"),
    yeniSifreTekrar: formData.get("yeniSifreTekrar"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password) {
    return { ok: false, error: "Hesabınız için şifre tanımlı değil" };
  }
  const valid = await bcrypt.compare(parsed.data.mevcutSifre, user.password);
  if (!valid) return { ok: false, error: "Mevcut şifre hatalı" };

  const hash = await bcrypt.hash(parsed.data.yeniSifre, 12);
  await db.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Auth",
    ozet: "Şifre değiştirildi",
  });

  return { ok: true };
}

/* ============================================================
   ŞİRKET BİLGİLERİ
   ============================================================ */

const sirketSchema = z.object({
  sirketAdi: z.string().max(200).optional().or(z.literal("")),
  vergiNo: z.string().max(50).optional().or(z.literal("")),
  vergiDairesi: z.string().max(100).optional().or(z.literal("")),
  tcKimlikNo: z.string().max(20).optional().or(z.literal("")),
  adres: z.string().max(500).optional().or(z.literal("")),
  sehir: z.string().max(100).optional().or(z.literal("")),
  ulke: z.string().max(100).optional().or(z.literal("")),
  telefon: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  iban: z.string().max(50).optional().or(z.literal("")),
  bankaAdi: z.string().max(100).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
});

function nullify<T extends Record<string, string | undefined>>(obj: T) {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && v !== "" ? v : null;
  }
  return out;
}

export async function updateSirketBilgisi(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  // Sadece text alanları al, File objelerini at
  const textData: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") textData[k] = v;
  }
  const parsed = sirketSchema.safeParse(textData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = nullify(parsed.data);

  await db.sirketBilgisi.upsert({
    where: { userId },
    create: {
      userId,
      ulke: "Türkiye",
      ...data,
    },
    update: data,
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Settings",
    entityId: "sirket",
    ozet: "Şirket bilgileri güncellendi",
  });

  revalidatePath("/uygulama/ayarlar/sirket");
  return { ok: true };
}

/* ============================================================
   LOGO UPLOAD
   ============================================================ */

export async function uploadLogo(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Dosya seçilmedi" };
  }
  try {
    // Eski logoyu sil
    const existing = await db.sirketBilgisi.findUnique({
      where: { userId },
      select: { logoUrl: true },
    });
    if (existing?.logoUrl?.startsWith("/api/files/")) {
      const oldPath = existing.logoUrl.replace("/api/files/", "");
      try {
        await deleteFile(oldPath);
      } catch {
        /* sessiz */
      }
    }

    const saved = await saveFile(
      file,
      "logolar",
      userId,
      FILE_LIMITS.logoMimes,
    );

    await db.sirketBilgisi.upsert({
      where: { userId },
      create: { userId, ulke: "Türkiye", logoUrl: saved.publicUrl },
      update: { logoUrl: saved.publicUrl },
    });

    await logAction({
      userId,
      islem: "update",
      entity: "Settings",
      entityId: "logo",
      ozet: `Logo yüklendi: ${saved.originalName}`,
    });

    revalidatePath("/uygulama/ayarlar/sirket");
    return { ok: true, url: saved.publicUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Yükleme başarısız",
    };
  }
}

export async function deleteLogo(): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.sirketBilgisi.findUnique({
    where: { userId },
    select: { logoUrl: true },
  });
  if (existing?.logoUrl?.startsWith("/api/files/")) {
    const oldPath = existing.logoUrl.replace("/api/files/", "");
    try {
      await deleteFile(oldPath);
    } catch {
      /* sessiz */
    }
  }
  await db.sirketBilgisi.upsert({
    where: { userId },
    create: { userId, ulke: "Türkiye", logoUrl: null },
    update: { logoUrl: null },
  });

  await logAction({
    userId,
    islem: "delete",
    entity: "Settings",
    entityId: "logo",
    ozet: "Logo silindi",
  });

  revalidatePath("/uygulama/ayarlar/sirket");
  return { ok: true };
}

/* ============================================================
   GÖRÜNÜM
   ============================================================ */

const gorunumSchema = z.object({
  tema: z.enum(["light", "dark", "system"]),
  yogunluk: z.enum(["comfortable", "compact"]),
});

export async function updateGorunum(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = gorunumSchema.safeParse({
    tema: formData.get("tema"),
    yogunluk: formData.get("yogunluk"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  await db.userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Settings",
    entityId: "gorunum",
    ozet: `Tema "${parsed.data.tema}", yoğunluk "${parsed.data.yogunluk}" olarak güncellendi`,
  });

  revalidatePath("/uygulama/ayarlar/gorunum");
  return { ok: true };
}

/* ============================================================
   BİLDİRİMLER + VARSAYILANLAR
   ============================================================ */

const bildirimSchema = z.object({
  emailBildirim: z.coerce.boolean().default(false),
  pushBildirim: z.coerce.boolean().default(false),
  vadeUyariGun: z.coerce.number().int().min(0).max(60).default(3),
  defaultKdvOrani: z.coerce.number().min(0).max(100).default(20),
  defaultParaBirimi: z.string().length(3).default("TRY"),
  defaultVadeGun: z.coerce.number().int().min(0).max(365).default(30),
});

/* ============================================================
   MODÜL TOGGLE
   ============================================================ */

const modulSchema = z.object({
  modulFaturalar: z.coerce.boolean().default(false),
  modulHareketler: z.coerce.boolean().default(false),
  modulUrunler: z.coerce.boolean().default(false),
  modulTekrarlayanlar: z.coerce.boolean().default(false),
  modulHatirlaticilar: z.coerce.boolean().default(false),
  modulEtiketler: z.coerce.boolean().default(false),
});

export async function updateModuller(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const o: Record<string, unknown> = {};
  for (const key of [
    "modulFaturalar",
    "modulHareketler",
    "modulUrunler",
    "modulTekrarlayanlar",
    "modulHatirlaticilar",
    "modulEtiketler",
  ]) {
    o[key] = formData.has(key);
  }

  const parsed = modulSchema.safeParse(o);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  await db.userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  const aktif = Object.entries(parsed.data)
    .filter(([, v]) => v)
    .map(([k]) => k.replace("modul", ""))
    .join(", ");

  await logAction({
    userId,
    islem: "update",
    entity: "Settings",
    entityId: "moduller",
    ozet: `Modül tercihleri güncellendi: ${aktif || "(hepsi kapalı)"}`,
  });

  revalidatePath("/uygulama", "layout");
  return { ok: true };
}

export async function updateBildirim(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const o: Record<string, unknown> = Object.fromEntries(formData.entries());
  // Checkbox'lar formData'da yoksa false
  if (!("emailBildirim" in o)) o.emailBildirim = false;
  if (!("pushBildirim" in o)) o.pushBildirim = false;

  const parsed = bildirimSchema.safeParse(o);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  await db.userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Settings",
    entityId: "bildirim",
    ozet: "Bildirim ve varsayılan tercihler güncellendi",
  });

  revalidatePath("/uygulama/ayarlar/bildirim");
  return { ok: true };
}
