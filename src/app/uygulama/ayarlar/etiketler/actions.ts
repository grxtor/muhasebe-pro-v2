"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { TAG_COLORS } from "@/lib/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

const tagSchema = z.object({
  ad: z.string().min(1, "Ad zorunludur").max(50),
  renk: z.enum(TAG_COLORS).default("gray"),
  aciklama: z.string().max(500).optional().or(z.literal("")),
});

function clean(formData: FormData) {
  return {
    ad: formData.get("ad"),
    renk: formData.get("renk"),
    aciklama: formData.get("aciklama") || undefined,
  };
}

export async function createTag(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = tagSchema.safeParse(clean(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const exists = await db.tag.findFirst({
    where: { userId, ad: parsed.data.ad },
    select: { id: true },
  });
  if (exists) {
    return { ok: false, error: `"${parsed.data.ad}" etiketi zaten var` };
  }

  const tag = await db.tag.create({
    data: {
      userId,
      ad: parsed.data.ad,
      renk: parsed.data.renk,
      aciklama: parsed.data.aciklama || null,
    },
  });

  await logAction({
    userId,
    islem: "create",
    entity: "Tag",
    entityId: tag.id,
    ozet: `"${tag.ad}" etiketi eklendi`,
  });

  revalidatePath("/uygulama/ayarlar/etiketler");
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}

export async function updateTag(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = tagSchema.safeParse(clean(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.tag.findFirst({
    where: { id, userId },
    select: { id: true, ad: true },
  });
  if (!existing) return { ok: false, error: "Etiket bulunamadı" };

  if (existing.ad !== parsed.data.ad) {
    const dupe = await db.tag.findFirst({
      where: { userId, ad: parsed.data.ad, NOT: { id } },
      select: { id: true },
    });
    if (dupe) {
      return { ok: false, error: `"${parsed.data.ad}" başka bir etikette var` };
    }
  }

  await db.tag.update({
    where: { id },
    data: {
      ad: parsed.data.ad,
      renk: parsed.data.renk,
      aciklama: parsed.data.aciklama || null,
    },
  });

  await logAction({
    userId,
    islem: "update",
    entity: "Tag",
    entityId: id,
    ozet: `"${parsed.data.ad}" etiketi güncellendi`,
  });

  revalidatePath("/uygulama/ayarlar/etiketler");
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}

export async function deleteTag(id: number): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.tag.findFirst({
    where: { id, userId },
    select: { ad: true },
  });
  if (!existing) return { ok: false, error: "Etiket bulunamadı" };

  await db.tag.delete({ where: { id } });

  await logAction({
    userId,
    islem: "delete",
    entity: "Tag",
    entityId: id,
    ozet: `"${existing.ad}" etiketi silindi`,
  });

  revalidatePath("/uygulama/ayarlar/etiketler");
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}

/**
 * Bir profile etiket atar (toplu). Mevcut etiketler değiştirilir,
 * verilen liste ile tam eşleşir.
 */
export async function setCariTags(
  cariId: number,
  tagIds: number[],
): Promise<ActionResult> {
  const userId = await getUserId();

  // Cari sahibi kontrol
  const cari = await db.cari.findFirst({
    where: { id: cariId, userId },
    select: { id: true, unvan: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  // Tag'lerin de kullanıcıya ait olduğunu doğrula
  const validTags = await db.tag.findMany({
    where: { id: { in: tagIds }, userId },
    select: { id: true },
  });
  const validIds = new Set(validTags.map((t) => t.id));

  await db.$transaction([
    db.cariTag.deleteMany({ where: { cariId } }),
    db.cariTag.createMany({
      data: tagIds
        .filter((id) => validIds.has(id))
        .map((tagId) => ({ cariId, tagId })),
      skipDuplicates: true,
    }),
  ]);

  await logAction({
    userId,
    islem: "update",
    entity: "Cari",
    entityId: cariId,
    ozet: `"${cari.unvan}" etiketleri güncellendi (${tagIds.length} etiket)`,
  });

  revalidatePath("/uygulama/profiller");
  return { ok: true };
}
