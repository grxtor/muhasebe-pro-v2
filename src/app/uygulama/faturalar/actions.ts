"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { faturaSchema } from "@/lib/schemas/fatura";
import { FaturaYonu, OdemeDurumu, OdemeYonu } from "@/lib/enums";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  if (!("odemeNotuOlustur" in o)) o.odemeNotuOlustur = false;
  return o;
}

function hesapla(tutar: number, oran: number) {
  const kdvTutari = +(tutar * (oran / 100)).toFixed(2);
  const toplamTutar = +(tutar + kdvTutari).toFixed(2);
  return { kdvTutari, toplamTutar };
}

export async function nextFaturaNo(): Promise<string> {
  const userId = await getUserId();
  const yil = new Date().getFullYear();
  const count = await db.fatura.count({ where: { userId } });
  return `${yil}-${String(count + 1).padStart(4, "0")}`;
}

export async function createFatura(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = faturaSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const cari = await db.cari.findFirst({
    where: { id: data.cariId, userId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  const dupe = await db.fatura.findFirst({
    where: { userId, faturaNo: data.faturaNo },
    select: { id: true },
  });
  if (dupe) {
    return { ok: false, error: `${data.faturaNo} numaralı fatura zaten var` };
  }

  const { kdvTutari, toplamTutar } = hesapla(data.tutar, data.kdvOrani);
  const vadeTarihi =
    data.vadeTarihi ?? new Date(data.tarih.getTime() + 30 * 86_400_000);

  const result = await db.$transaction(async (tx) => {
    const fatura = await tx.fatura.create({
      data: {
        userId,
        cariId: data.cariId,
        yon: data.yon,
        faturaNo: data.faturaNo,
        tarih: data.tarih,
        vadeTarihi,
        isAciklamasi: data.isAciklamasi,
        tutar: data.tutar,
        kdvOrani: data.kdvOrani,
        kdvTutari,
        toplamTutar,
        paraBirimi: data.paraBirimi,
        durum: data.durum,
        notlar: data.notlar,
      },
    });

    if (data.odemeNotuOlustur) {
      await tx.odemeNotu.create({
        data: {
          userId,
          cariId: data.cariId,
          yon:
            data.yon === FaturaYonu.Gonderilen
              ? OdemeYonu.Alacak
              : OdemeYonu.Borc,
          baslik: `Fatura ${data.faturaNo}`,
          aciklama: data.isAciklamasi,
          tutar: toplamTutar,
          paraBirimi: data.paraBirimi,
          vadeTarihi,
          durum: OdemeDurumu.Beklemede,
          faturaId: fatura.id,
        },
      });
    }

    return fatura;
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true, data: { id: result.id } };
}

export async function updateFatura(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = faturaSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  const existing = await db.fatura.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  const dupe = await db.fatura.findFirst({
    where: { userId, faturaNo: data.faturaNo, NOT: { id } },
    select: { id: true },
  });
  if (dupe) {
    return { ok: false, error: `${data.faturaNo} numaralı fatura zaten var` };
  }

  const { kdvTutari, toplamTutar } = hesapla(data.tutar, data.kdvOrani);

  await db.fatura.update({
    where: { id },
    data: {
      cariId: data.cariId,
      yon: data.yon,
      faturaNo: data.faturaNo,
      tarih: data.tarih,
      vadeTarihi: data.vadeTarihi,
      isAciklamasi: data.isAciklamasi,
      tutar: data.tutar,
      kdvOrani: data.kdvOrani,
      kdvTutari,
      toplamTutar,
      paraBirimi: data.paraBirimi,
      durum: data.durum,
      notlar: data.notlar,
    },
  });

  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama");
  return { ok: true };
}

export async function deleteFatura(id: number): Promise<ActionResult> {
  const userId = await getUserId();
  const existing = await db.fatura.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };
  await db.fatura.delete({ where: { id } });
  revalidatePath("/uygulama/faturalar");
  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama");
  return { ok: true };
}
