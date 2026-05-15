"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getOrgContext } from "./auth-helpers";
import { logAction } from "./audit";
import { saveFile, deleteFile, FILE_LIMITS } from "./files";

export type DekontHedef =
  | { tip: "fatura"; id: number }
  | { tip: "odemeNotu"; id: number }
  | { tip: "cari"; id: number }
  | { tip: "hareket"; id: number };

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface DekontDto {
  id: number;
  dosyaAdi: string;
  url: string;
  boyut: number;
  mimeTip: string | null;
  aciklama: string | null;
  eklemeTarihi: string;
}

async function verifyOwnership(
  hedef: DekontHedef,
  orgId: string,
): Promise<{ baslik: string } | null> {
  switch (hedef.tip) {
    case "fatura": {
      const f = await db.fatura.findFirst({
        where: { id: hedef.id, organizationId: orgId },
        select: { faturaNo: true },
      });
      return f ? { baslik: `Fatura ${f.faturaNo}` } : null;
    }
    case "odemeNotu": {
      const o = await db.odemeNotu.findFirst({
        where: { id: hedef.id, organizationId: orgId },
        select: { baslik: true },
      });
      return o ? { baslik: o.baslik } : null;
    }
    case "cari": {
      const c = await db.cari.findFirst({
        where: { id: hedef.id, organizationId: orgId },
        select: { unvan: true },
      });
      return c ? { baslik: c.unvan } : null;
    }
    case "hareket": {
      const h = await db.hareket.findFirst({
        where: { id: hedef.id, organizationId: orgId },
        select: { aciklama: true, id: true },
      });
      return h ? { baslik: h.aciklama ?? `Hareket #${h.id}` } : null;
    }
  }
}

function targetField(hedef: DekontHedef) {
  switch (hedef.tip) {
    case "fatura":
      return { faturaId: hedef.id };
    case "odemeNotu":
      return { odemeNotuId: hedef.id };
    case "cari":
      return { cariId: hedef.id };
    case "hareket":
      return { hareketId: hedef.id };
  }
}

function revalidateAll(hedef: DekontHedef) {
  switch (hedef.tip) {
    case "fatura":
      revalidatePath("/uygulama/faturalar");
      break;
    case "odemeNotu":
      revalidatePath("/uygulama/alacaklar");
      revalidatePath("/uygulama/borclar");
      break;
    case "cari":
      revalidatePath("/uygulama/profiller");
      break;
    case "hareket":
      revalidatePath("/uygulama/hareketler");
      break;
  }
}

export async function listDekontlar(hedef: DekontHedef): Promise<DekontDto[]> {
  const ctx = await getOrgContext();
  const owned = await verifyOwnership(hedef, ctx.orgId);
  if (!owned) return [];

  const items = await db.dekont.findMany({
    where: { organizationId: ctx.orgId, ...targetField(hedef) },
    orderBy: { eklemeTarihi: "desc" },
  });
  return items.map((d) => ({
    id: d.id,
    dosyaAdi: d.dosyaAdi,
    url: `/api/files/${d.depoYolu}`,
    boyut: d.boyut,
    mimeTip: d.mimeTip,
    aciklama: d.aciklama,
    eklemeTarihi: d.eklemeTarihi.toISOString(),
  }));
}

export async function uploadDekontlar(
  hedef: DekontHedef,
  formData: FormData,
): Promise<ActionResult<DekontDto[]>> {
  const ctx = await getOrgContext();
  const owned = await verifyOwnership(hedef, ctx.orgId);
  if (!owned) return { ok: false, error: "Hedef bulunamadı" };

  const files = formData.getAll("dosya").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  if (files.length === 0) return { ok: false, error: "Dosya seçilmedi" };

  const uploaded: DekontDto[] = [];
  for (const file of files) {
    try {
      // Dosyalar org-bazlı klasörde tutulur
      const saved = await saveFile(
        file,
        "dekontlar",
        ctx.orgId,
        FILE_LIMITS.dekontMimes,
      );
      const dekont = await db.dekont.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          ...targetField(hedef),
          dosyaAdi: saved.originalName,
          depoYolu: saved.relativePath,
          boyut: saved.size,
          mimeTip: saved.mimeType,
        },
      });
      uploaded.push({
        id: dekont.id,
        dosyaAdi: dekont.dosyaAdi,
        url: saved.publicUrl,
        boyut: dekont.boyut,
        mimeTip: dekont.mimeTip,
        aciklama: dekont.aciklama,
        eklemeTarihi: dekont.eklemeTarihi.toISOString(),
      });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Yükleme başarısız",
      };
    }
  }

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Dekont",
    entityId: hedef.id,
    ozet: `${owned.baslik}: ${uploaded.length} dosya eklendi`,
  });

  revalidateAll(hedef);
  return { ok: true, data: uploaded };
}

export async function deleteDekont(dekontId: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const dekont = await db.dekont.findFirst({
    where: { id: dekontId, organizationId: ctx.orgId },
    select: { id: true, dosyaAdi: true, depoYolu: true },
  });
  if (!dekont) return { ok: false, error: "Dekont bulunamadı" };

  try {
    await deleteFile(dekont.depoYolu);
  } catch (err) {
    console.error("[dekont] file delete failed:", err);
  }

  await db.dekont.delete({ where: { id: dekontId } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Dekont",
    entityId: dekontId,
    ozet: `Dekont silindi: ${dekont.dosyaAdi}`,
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/profiller");
  revalidatePath("/uygulama/hareketler");
  return { ok: true };
}
