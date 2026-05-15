"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { odemeNotuSchema } from "@/lib/schemas/odeme-notu";
import { OdemeDurumu, OdemeYonu, HareketTipi } from "@/lib/enums";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  return o;
}

export async function createOdemeNotu(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = odemeNotuSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const cari = await db.cari.findFirst({
    where: { id: parsed.data.cariId, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  await db.odemeNotu.create({
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
    entity: "OdemeNotu",
    ozet: `${parsed.data.yon === OdemeYonu.Alacak ? "Alacak" : "Borç"} eklendi: ${parsed.data.baslik}`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function updateOdemeNotu(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = odemeNotuSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const existing = await db.odemeNotu.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, baslik: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  await db.odemeNotu.update({
    where: { id },
    data: parsed.data,
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "OdemeNotu",
    entityId: id,
    ozet: `Güncellendi: ${parsed.data.baslik}`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteOdemeNotu(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.odemeNotu.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, baslik: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };
  await db.odemeNotu.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "OdemeNotu",
    entityId: id,
    ozet: `Silindi: ${existing.baslik}`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function tahsilEtVeyaOde(
  id: number,
  odenenTutar?: number,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const notu = await db.odemeNotu.findFirst({
    where: { id, organizationId: ctx.orgId },
  });
  if (!notu) return { ok: false, error: "Kayıt bulunamadı" };

  const kalan = Number(notu.tutar) - Number(notu.odenenTutar);
  const eklenecek =
    odenenTutar !== undefined && odenenTutar > 0
      ? Math.min(odenenTutar, kalan)
      : kalan;

  if (eklenecek <= 0) {
    return { ok: false, error: "Tahsil edilecek tutar kalmadı" };
  }

  const yeniOdenen = Number(notu.odenenTutar) + eklenecek;
  const tamamlandi = yeniOdenen >= Number(notu.tutar);

  await db.$transaction([
    db.odemeNotu.update({
      where: { id },
      data: {
        odenenTutar: yeniOdenen,
        durum: tamamlandi ? OdemeDurumu.Odendi : OdemeDurumu.KismiOdendi,
        odemeTarihi: tamamlandi ? new Date() : notu.odemeTarihi,
      },
    }),
    db.hareket.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        cariId: notu.cariId,
        tarih: new Date(),
        tip:
          notu.yon === OdemeYonu.Alacak
            ? HareketTipi.Alacak
            : HareketTipi.Borc,
        tutar: eklenecek,
        paraBirimi: notu.paraBirimi,
        aciklama: `${notu.baslik} — ${
          notu.yon === OdemeYonu.Alacak ? "Tahsilat" : "Ödeme"
        }${tamamlandi ? " (tamamlandı)" : " (kısmi)"}`,
      },
    }),
  ]);

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: notu.yon === OdemeYonu.Alacak ? "tahsil" : "ode",
    entity: "OdemeNotu",
    entityId: id,
    ozet: `${notu.baslik}: ${eklenecek.toFixed(2)} ${notu.paraBirimi} ${
      notu.yon === OdemeYonu.Alacak ? "tahsil edildi" : "ödendi"
    }`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/hareketler");
  revalidatePath("/uygulama");
  return { ok: true };
}
