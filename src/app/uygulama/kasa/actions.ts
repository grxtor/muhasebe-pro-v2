"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { KasaHareketTip } from "@/lib/enums";
import { kasaSchema, kasaHareketiSchema } from "@/lib/schemas/kasa";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseKasaFD(formData: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("aktif" in o)) o.aktif = false;
  if (!("varsayilan" in o)) o.varsayilan = false;
  return kasaSchema.safeParse(o);
}

function parseHareketFD(formData: FormData) {
  return kasaHareketiSchema.safeParse({
    kasaId: formData.get("kasaId"),
    hedefKasaId: formData.get("hedefKasaId") || undefined,
    tip: formData.get("tip"),
    tutar: formData.get("tutar"),
    tarih: formData.get("tarih"),
    aciklama: formData.get("aciklama") || undefined,
    belgeNo: formData.get("belgeNo") || undefined,
  });
}

/* ============================================================
   Kasa CRUD
   ============================================================ */

export async function createKasa(formData: FormData): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = parseKasaFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const k = await db.$transaction(async (tx) => {
    // Eğer varsayılan işaretlendiyse mevcutları sıfırla
    if (data.varsayilan) {
      await tx.kasa.updateMany({
        where: { organizationId: ctx.orgId, varsayilan: true },
        data: { varsayilan: false },
      });
    }
    return tx.kasa.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        ad: data.ad,
        paraBirimi: data.paraBirimi,
        acilis: data.acilis,
        aciklama: data.aciklama,
        aktif: data.aktif,
        varsayilan: data.varsayilan,
      },
    });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Kasa",
    entityId: k.id,
    ozet: `Kasa eklendi: ${k.ad} (${k.paraBirimi})`,
  });

  revalidatePath("/uygulama/kasa");
  return { ok: true };
}

export async function updateKasa(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = parseKasaFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const existing = await db.kasa.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, ad: true },
  });
  if (!existing) return { ok: false, error: "Kasa bulunamadı" };

  await db.$transaction(async (tx) => {
    if (data.varsayilan) {
      await tx.kasa.updateMany({
        where: {
          organizationId: ctx.orgId,
          varsayilan: true,
          NOT: { id },
        },
        data: { varsayilan: false },
      });
    }
    await tx.kasa.update({
      where: { id },
      data: {
        ad: data.ad,
        paraBirimi: data.paraBirimi,
        acilis: data.acilis,
        aciklama: data.aciklama,
        aktif: data.aktif,
        varsayilan: data.varsayilan,
      },
    });
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "Kasa",
    entityId: id,
    ozet: `Kasa güncellendi: ${data.ad}`,
  });

  revalidatePath("/uygulama/kasa");
  revalidatePath(`/uygulama/kasa/${id}`);
  return { ok: true };
}

export async function deleteKasa(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.kasa.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { ad: true },
  });
  if (!existing) return { ok: false, error: "Kasa bulunamadı" };

  await db.kasa.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Kasa",
    entityId: id,
    ozet: `Kasa silindi: ${existing.ad}`,
  });

  revalidatePath("/uygulama/kasa");
  return { ok: true };
}

export async function setVarsayilanKasa(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.kasa.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, ad: true, aktif: true },
  });
  if (!existing) return { ok: false, error: "Kasa bulunamadı" };
  if (!existing.aktif) {
    return { ok: false, error: "Pasif kasa varsayılan yapılamaz" };
  }

  await db.$transaction([
    db.kasa.updateMany({
      where: {
        organizationId: ctx.orgId,
        varsayilan: true,
        NOT: { id },
      },
      data: { varsayilan: false },
    }),
    db.kasa.update({
      where: { id },
      data: { varsayilan: true },
    }),
  ]);

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "Kasa",
    entityId: id,
    ozet: `Varsayılan kasa: ${existing.ad}`,
  });

  revalidatePath("/uygulama/kasa");
  return { ok: true };
}

/* ============================================================
   Kasa Hareketi
   ============================================================ */

export async function createKasaHareketi(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const parsed = parseHareketFD(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const kasa = await db.kasa.findFirst({
    where: { id: data.kasaId, organizationId: ctx.orgId },
    select: { id: true, ad: true, paraBirimi: true, aktif: true },
  });
  if (!kasa) return { ok: false, error: "Kasa bulunamadı" };
  if (!kasa.aktif) return { ok: false, error: "Pasif kasaya hareket eklenemez" };

  if (data.tip === KasaHareketTip.Transfer) {
    if (!data.hedefKasaId) {
      return { ok: false, error: "Transfer için hedef kasa zorunlu" };
    }
    const hedef = await db.kasa.findFirst({
      where: { id: data.hedefKasaId, organizationId: ctx.orgId },
      select: { id: true, ad: true, paraBirimi: true, aktif: true },
    });
    if (!hedef) return { ok: false, error: "Hedef kasa bulunamadı" };
    if (!hedef.aktif) {
      return { ok: false, error: "Pasif hedef kasaya transfer yapılamaz" };
    }
    if (hedef.paraBirimi !== kasa.paraBirimi) {
      return {
        ok: false,
        error: `Para birimi uyuşmuyor (${kasa.paraBirimi} → ${hedef.paraBirimi})`,
      };
    }

    // Transfer: aynı belgeNo ile iki kayıt
    // Kaynak kasada Cikis, hedef kasada Giris olarak kaydet.
    // Bu sayede bakiye hesabı basit: bakiye = acilis + sum(Giris) - sum(Cikis)
    // Transfer çiftliği belgeNo ile takip edilir; silme aynı belgeNo'lu tüm kayıtları temizler.
    const transferBelgeNo =
      data.belgeNo && data.belgeNo.length > 0
        ? data.belgeNo
        : `TRF-${Date.now().toString(36).toUpperCase()}`;

    await db.$transaction([
      // Kaynak: Cikis kaydı, hedefKasaId dolu (transferin diğer ucu)
      db.kasaHareketi.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          kasaId: kasa.id,
          hedefKasaId: hedef.id,
          tip: KasaHareketTip.Transfer,
          tutar: data.tutar,
          paraBirimi: kasa.paraBirimi,
          tarih: data.tarih,
          aciklama: data.aciklama
            ? `Transfer → ${hedef.ad}: ${data.aciklama}`
            : `Transfer → ${hedef.ad}`,
          belgeNo: transferBelgeNo,
        },
      }),
      // Hedef: Giris (transferin karşı ucu)
      db.kasaHareketi.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          kasaId: hedef.id,
          hedefKasaId: kasa.id,
          tip: KasaHareketTip.Transfer,
          tutar: data.tutar,
          paraBirimi: hedef.paraBirimi,
          tarih: data.tarih,
          aciklama: data.aciklama
            ? `Transfer ← ${kasa.ad}: ${data.aciklama}`
            : `Transfer ← ${kasa.ad}`,
          belgeNo: transferBelgeNo,
        },
      }),
    ]);

    await logAction({
      userId: ctx.userId,
      organizationId: ctx.orgId,
      islem: "create",
      entity: "KasaHareketi",
      ozet: `Transfer: ${kasa.ad} → ${hedef.ad} (${data.tutar} ${kasa.paraBirimi})`,
    });
  } else {
    // Giriş veya Çıkış
    const h = await db.kasaHareketi.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        kasaId: kasa.id,
        tip: data.tip,
        tutar: data.tutar,
        paraBirimi: kasa.paraBirimi,
        tarih: data.tarih,
        aciklama: data.aciklama,
        belgeNo: data.belgeNo,
      },
    });

    await logAction({
      userId: ctx.userId,
      organizationId: ctx.orgId,
      islem: "create",
      entity: "KasaHareketi",
      entityId: h.id,
      ozet: `${kasa.ad}: ${data.tip} ${data.tutar} ${kasa.paraBirimi}`,
    });
  }

  revalidatePath("/uygulama/kasa");
  revalidatePath(`/uygulama/kasa/${data.kasaId}`);
  if (data.hedefKasaId) {
    revalidatePath(`/uygulama/kasa/${data.hedefKasaId}`);
  }
  return { ok: true };
}

export async function deleteKasaHareketi(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.kasaHareketi.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: {
      id: true,
      kasaId: true,
      hedefKasaId: true,
      tip: true,
      belgeNo: true,
      tutar: true,
      paraBirimi: true,
      kasa: { select: { ad: true } },
    },
  });
  if (!existing) return { ok: false, error: "Hareket bulunamadı" };

  // Transferse hem kaynak hem hedef tarafını sil (aynı belgeNo paylaşıyorlar)
  if (existing.tip === KasaHareketTip.Transfer && existing.belgeNo) {
    await db.kasaHareketi.deleteMany({
      where: {
        organizationId: ctx.orgId,
        tip: KasaHareketTip.Transfer,
        belgeNo: existing.belgeNo,
        kasaId: { in: [existing.kasaId, existing.hedefKasaId ?? -1] },
      },
    });
  } else {
    await db.kasaHareketi.delete({ where: { id } });
  }

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "KasaHareketi",
    entityId: id,
    ozet: `Hareket silindi: ${existing.kasa.ad} ${existing.tip} ${existing.tutar.toString()} ${existing.paraBirimi}`,
  });

  revalidatePath("/uygulama/kasa");
  revalidatePath(`/uygulama/kasa/${existing.kasaId}`);
  if (existing.hedefKasaId) {
    revalidatePath(`/uygulama/kasa/${existing.hedefKasaId}`);
  }
  return { ok: true };
}
