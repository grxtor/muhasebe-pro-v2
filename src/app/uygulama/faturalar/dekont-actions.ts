"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { saveFile, deleteFile, FILE_LIMITS } from "@/lib/files";

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

/**
 * Faturaya bağlı dekontları listeler.
 */
export async function listFaturaDekontlari(
  faturaId: number,
): Promise<DekontDto[]> {
  const userId = await getUserId();
  // Auth check: sadece kullanıcının kendi faturasının dekontları
  const fatura = await db.fatura.findFirst({
    where: { id: faturaId, userId },
    select: { id: true },
  });
  if (!fatura) return [];

  const items = await db.dekont.findMany({
    where: { userId, faturaId },
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

/**
 * Faturaya bir veya birden çok dosya yükler.
 */
export async function uploadFaturaDekonti(
  faturaId: number,
  formData: FormData,
): Promise<ActionResult<DekontDto[]>> {
  const userId = await getUserId();
  const fatura = await db.fatura.findFirst({
    where: { id: faturaId, userId },
    select: { id: true, faturaNo: true },
  });
  if (!fatura) return { ok: false, error: "Fatura bulunamadı" };

  const files = formData.getAll("dosya").filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  if (files.length === 0) return { ok: false, error: "Dosya seçilmedi" };

  const uploaded: DekontDto[] = [];
  for (const file of files) {
    try {
      const saved = await saveFile(
        file,
        "dekontlar",
        userId,
        FILE_LIMITS.dekontMimes,
      );
      const dekont = await db.dekont.create({
        data: {
          userId,
          faturaId,
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
    userId,
    islem: "create",
    entity: "Dekont",
    entityId: faturaId,
    ozet: `${fatura.faturaNo} faturasına ${uploaded.length} dekont yüklendi`,
  });

  revalidatePath("/uygulama/faturalar");
  return { ok: true, data: uploaded };
}

export async function deleteFaturaDekonti(
  dekontId: number,
): Promise<ActionResult> {
  const userId = await getUserId();
  const dekont = await db.dekont.findFirst({
    where: { id: dekontId, userId },
    select: { id: true, dosyaAdi: true, depoYolu: true, faturaId: true },
  });
  if (!dekont) return { ok: false, error: "Dekont bulunamadı" };

  try {
    await deleteFile(dekont.depoYolu);
  } catch (err) {
    console.error("[dekont] file delete failed:", err);
    // Dosya yoksa bile DB kaydını sil
  }

  await db.dekont.delete({ where: { id: dekontId } });

  await logAction({
    userId,
    islem: "delete",
    entity: "Dekont",
    entityId: dekontId,
    ozet: `Dekont silindi: ${dekont.dosyaAdi}`,
  });

  revalidatePath("/uygulama/faturalar");
  return { ok: true };
}
