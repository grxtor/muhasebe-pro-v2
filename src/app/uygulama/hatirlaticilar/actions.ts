"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { HatirlaticiOncelik } from "@/lib/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

const hatirlaticiSchema = z.object({
  baslik: z.string().min(2).max(250),
  aciklama: z.string().max(2000).optional().or(z.literal("")),
  hatirlatmaTarihi: z.coerce.date(),
  oncelik: z.enum([
    HatirlaticiOncelik.Dusuk,
    HatirlaticiOncelik.Normal,
    HatirlaticiOncelik.Yuksek,
  ]),
  cariId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal(0).transform(() => undefined)),
});

function parse(formData: FormData) {
  return hatirlaticiSchema.safeParse({
    baslik: formData.get("baslik"),
    aciklama: formData.get("aciklama") || undefined,
    hatirlatmaTarihi: formData.get("hatirlatmaTarihi"),
    oncelik: formData.get("oncelik"),
    cariId: formData.get("cariId") || undefined,
  });
}

export async function createHatirlatici(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const h = await db.hatirlatici.create({
    data: {
      userId,
      baslik: parsed.data.baslik,
      aciklama: parsed.data.aciklama || null,
      hatirlatmaTarihi: parsed.data.hatirlatmaTarihi,
      oncelik: parsed.data.oncelik,
      cariId: parsed.data.cariId,
    },
  });

  await logAction({
    userId,
    islem: "create",
    entity: "Hatirlatici",
    entityId: h.id,
    ozet: `Hatırlatıcı eklendi: ${h.baslik}`,
  });

  revalidatePath("/uygulama/hatirlaticilar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateHatirlatici(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.hatirlatici.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.hatirlatici.update({
    where: { id },
    data: {
      baslik: parsed.data.baslik,
      aciklama: parsed.data.aciklama || null,
      hatirlatmaTarihi: parsed.data.hatirlatmaTarihi,
      oncelik: parsed.data.oncelik,
      cariId: parsed.data.cariId,
    },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Hatirlatici",
    entityId: id,
    ozet: `Hatırlatıcı güncellendi: ${parsed.data.baslik}`,
  });

  revalidatePath("/uygulama/hatirlaticilar");
  return { ok: true };
}

export async function toggleHatirlaticiTamamla(
  id: number,
  tamamlandi: boolean,
): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.hatirlatici.findFirst({
    where: { id, userId },
    select: { baslik: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.hatirlatici.update({
    where: { id },
    data: {
      tamamlandi,
      tamamlanmaTarihi: tamamlandi ? new Date() : null,
    },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Hatirlatici",
    entityId: id,
    ozet: `"${existing.baslik}" ${tamamlandi ? "tamamlandı" : "tekrar açıldı"}`,
  });

  revalidatePath("/uygulama/hatirlaticilar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteHatirlatici(id: number): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.hatirlatici.findFirst({
    where: { id, userId },
    select: { baslik: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.hatirlatici.delete({ where: { id } });

  await logAction({
    userId,
    islem: "delete",
    entity: "Hatirlatici",
    entityId: id,
    ozet: `Hatırlatıcı silindi: ${existing.baslik}`,
  });

  revalidatePath("/uygulama/hatirlaticilar");
  return { ok: true };
}
