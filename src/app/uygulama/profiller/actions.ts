"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { profilSchema } from "@/lib/schemas/profil";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Yeni Cari (profil) için sonraki kodu üretir — CR-001, CR-002 …
 */
export async function nextProfilKodu(): Promise<string> {
  const userId = await getUserId();
  const count = await db.cari.count({ where: { userId } });
  return `CR-${String(count + 1).padStart(3, "0")}`;
}

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    o[k] = v;
  }
  // Checkbox: bağlı değilse FormData'da hiç yer almaz → false varsay
  if (!("aktif" in o)) o.aktif = false;
  return o;
}

export async function createProfil(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { userId, kod: parsed.data.kod },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Bu kod (${parsed.data.kod}) zaten kayıtlı` };
  }

  await db.cari.create({
    data: { ...parsed.data, userId },
  });
  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateProfil(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Kayıt bulunamadı" };
  }

  // Aynı kullanıcıda aynı kod başka bir profilde olamaz
  const dupe = await db.cari.findFirst({
    where: { userId, kod: parsed.data.kod, NOT: { id } },
    select: { id: true },
  });
  if (dupe) {
    return { ok: false, error: `Bu kod (${parsed.data.kod}) başka bir profilde kayıtlı` };
  }

  await db.cari.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteProfil(id: number): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.cari.findFirst({
    where: { id, userId },
    select: { id: true, _count: { select: { faturalar: true } } },
  });
  if (!existing) {
    return { ok: false, error: "Kayıt bulunamadı" };
  }
  if (existing._count.faturalar > 0) {
    return {
      ok: false,
      error: `Bu profile bağlı ${existing._count.faturalar} fatura var. Önce faturaları silin.`,
    };
  }
  await db.cari.delete({ where: { id } });
  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function toggleProfilAktif(
  id: number,
  aktif: boolean,
): Promise<ActionResult> {
  const userId = await getUserId();
  await db.cari.updateMany({
    where: { id, userId },
    data: { aktif },
  });
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}
