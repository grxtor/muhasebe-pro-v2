"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { profilSchema } from "@/lib/schemas/profil";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function nextProfilKodu(): Promise<string> {
  const { orgId } = await getOrgContext();
  const count = await db.cari.count({ where: { organizationId: orgId } });
  return `CR-${String(count + 1).padStart(3, "0")}`;
}

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("aktif" in o)) o.aktif = false;
  return o;
}

export async function createProfil(formData: FormData): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { organizationId: ctx.orgId, kod: parsed.data.kod },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Bu kod (${parsed.data.kod}) zaten kayıtlı` };
  }

  await db.cari.create({
    data: {
      ...parsed.data,
      userId: ctx.userId,
      organizationId: ctx.orgId,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Cari",
    ozet: `Profil eklendi: ${parsed.data.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateProfil(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = profilSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.cari.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Kayıt bulunamadı" };
  }

  const dupe = await db.cari.findFirst({
    where: {
      organizationId: ctx.orgId,
      kod: parsed.data.kod,
      NOT: { id },
    },
    select: { id: true },
  });
  if (dupe) {
    return {
      ok: false,
      error: `Bu kod (${parsed.data.kod}) başka bir profilde kayıtlı`,
    };
  }

  await db.cari.update({
    where: { id },
    data: parsed.data,
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "Cari",
    entityId: id,
    ozet: `Profil güncellendi: ${parsed.data.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteProfil(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.cari.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: {
      id: true,
      unvan: true,
      _count: { select: { faturalar: true } },
    },
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

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Cari",
    entityId: id,
    ozet: `Profil silindi: ${existing.unvan}`,
  });

  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function toggleProfilAktif(
  id: number,
  aktif: boolean,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  await db.cari.updateMany({
    where: { id, organizationId: ctx.orgId },
    data: { aktif },
  });
  revalidatePath("/uygulama/profiller");
  return { ok: true };
}
