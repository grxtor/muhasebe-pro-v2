"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { settleOdemeNotu } from "@/lib/finance-flow";
import {
  odemeNotuSchema,
  detayPromosyonSchema,
  detayTicaretSchema,
  detayAvansSchema,
  detayGelirSchema,
  detayBorcMuzikSchema,
} from "@/lib/schemas/odeme-notu";
import { slugify } from "@/lib/schemas/muzik";
import {
  OdemeYonu,
  CariTipi,
  HarcamaTuru,
  MuzikMagaza,
  type MuzikHarcamaKategori,
} from "@/lib/enums";
import { Prisma } from "@prisma/client";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fdToObject(formData: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("detay.")) continue;
    o[k] = v;
  }
  return o;
}

function readDetayFromFormData(formData: FormData): Record<string, unknown> {
  const detay: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("detay.")) continue;
    const key = k.slice("detay.".length);
    if (typeof v === "string" && v.trim() === "") continue;
    detay[key] = v;
  }
  return detay;
}

/**
 * Cari harcama türüne göre detay'ı validate edip
 * Prisma JSON olarak hazırlanan değer veya null döner.
 */
type DetayObject = Record<string, unknown>;

function hasMeaningfulDetayValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    value !== false
  );
}

function readMuzikGelirId(detay: unknown): number | null {
  if (!detay || typeof detay !== "object" || Array.isArray(detay)) return null;
  const raw = (detay as DetayObject).muzikGelirId;
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isMuzikGeliriRequested(detay: DetayObject | null): boolean {
  if (!detay) return false;
  if (detay.isMuzikGeliri === false || detay.isMuzikGeliri === "false") {
    return false;
  }
  return (
    detay.isMuzikGeliri === true ||
    detay.isMuzikGeliri === "true" ||
    Boolean(detay.muzikProfilId) ||
    Boolean(detay.muzikGelirId)
  );
}

function readMuzikHarcamaId(detay: unknown): number | null {
  if (!detay || typeof detay !== "object" || Array.isArray(detay)) return null;
  const raw = (detay as DetayObject).muzikHarcamaId;
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isMuzikHarcamasiRequested(detay: DetayObject | null): boolean {
  if (!detay) return false;
  if (
    detay.isMuzikHarcamasi === false ||
    detay.isMuzikHarcamasi === "false"
  ) {
    return false;
  }
  return (
    detay.isMuzikHarcamasi === true ||
    detay.isMuzikHarcamasi === "true" ||
    Boolean(detay.muzikHarcamaId)
  );
}

async function uniqueMuzikSlug(
  tx: Prisma.TransactionClient,
  organizationId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let i = 1;
  while (
    await tx.muzikProfil.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    })
  ) {
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
  return slug;
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function readIntList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return uniqueValues(
      value
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0),
    );
  }
  if (typeof value !== "string") return [];
  return uniqueValues(
    value
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  );
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueValues(
      value.map((x) => String(x).trim()).filter(Boolean),
    );
  }
  if (typeof value !== "string") return [];
  return uniqueValues(value.split("\n").map((x) => x.trim()).filter(Boolean));
}

function readMagazaList(value: unknown): MuzikMagaza[] {
  const valid = new Set(Object.values(MuzikMagaza) as string[]);
  const values = Array.isArray(value)
    ? value.map((x) => String(x))
    : typeof value === "string"
      ? value.split(",")
      : [];
  return uniqueValues(
    values
      .map((x) => x.trim())
      .filter((x): x is MuzikMagaza => valid.has(x)),
  );
}

function readMuzikProfilDetay(
  detay: DetayObject | null,
  extraMagazalar: (MuzikMagaza | null)[] = [],
) {
  const notlar =
    typeof detay?.notlar === "string" && detay.notlar.trim()
      ? detay.notlar.trim()
      : null;
  return {
    sanatciIds: readIntList(detay?.sanatciCariIds),
    isbirlikciler: readStringList(detay?.isbirlikciler),
    magazalar: uniqueValues([
      ...readMagazaList(detay?.magazalar),
      ...extraMagazalar.filter((m): m is MuzikMagaza => Boolean(m)),
    ]),
    notlar,
  };
}

function readSanatciOdemeleri(detay: DetayObject | null) {
  const raw = detay?.sanatciOdemeleri;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== "object" || Array.isArray(x)) return null;
      const row = x as Record<string, unknown>;
      const cariId = Number(row.cariId);
      const tutar = Number(row.tutar);
      if (!Number.isInteger(cariId) || cariId <= 0 || !Number.isFinite(tutar) || tutar <= 0) {
        return null;
      }
      return { cariId, tutar };
    })
    .filter((x): x is { cariId: number; tutar: number } => Boolean(x));
}

async function validateSanatciIds(
  tx: Prisma.TransactionClient,
  ctx: { orgId: string },
  sanatciIds: number[],
): Promise<number[]> {
  const ids = uniqueValues(sanatciIds);
  if (ids.length === 0) return [];
  const rows = await tx.cari.findMany({
    where: {
      id: { in: ids },
      organizationId: ctx.orgId,
      tip: CariTipi.Harcama,
      harcamaTuru: HarcamaTuru.Sanatci,
      aktif: true,
    },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new Error("Geçersiz sanatçı seçimi");
  }
  return ids;
}

async function applyMuzikProfilDetay(
  tx: Prisma.TransactionClient,
  ctx: { orgId: string },
  muzikProfilId: number,
  detay: DetayObject | null,
  extraMagazalar: (MuzikMagaza | null)[] = [],
) {
  const extras = readMuzikProfilDetay(detay, extraMagazalar);
  const sanatciIds = await validateSanatciIds(tx, ctx, extras.sanatciIds);

  if (sanatciIds.length > 0) {
    await tx.muzikProfilSanatci.createMany({
      data: sanatciIds.map((cariId) => ({ muzikProfilId, cariId })),
      skipDuplicates: true,
    });
  }

  const existing = await tx.muzikProfil.findFirst({
    where: { id: muzikProfilId, organizationId: ctx.orgId },
    select: { id: true, isbirlikciler: true, magazalar: true },
  });
  if (!existing) return;

  const data: Prisma.MuzikProfilUpdateInput = {};
  const nextMagazalar = uniqueValues([
    ...existing.magazalar,
    ...extras.magazalar,
  ]);
  if (nextMagazalar.length !== existing.magazalar.length) {
    data.magazalar = { set: nextMagazalar };
  }
  if (extras.isbirlikciler.length > 0) {
    data.isbirlikciler = { set: uniqueValues(extras.isbirlikciler) };
  }
  if (extras.notlar) {
    data.notlar = extras.notlar;
  }

  if (Object.keys(data).length > 0) {
    await tx.muzikProfil.update({
      where: { id: muzikProfilId },
      data,
    });
  }
}

async function createInlineSanatciOdemeleri(
  tx: Prisma.TransactionClient,
  ctx: { userId: string; orgId: string },
  input: {
    muzikProfilId: number;
    detay: DetayObject | null;
    tarih: Date;
    paraBirimi: string;
    not: string;
  },
): Promise<number[]> {
  if (readIntList(input.detay?.sanatciOdemesiIds).length > 0) {
    return readIntList(input.detay?.sanatciOdemesiIds);
  }
  const rows = readSanatciOdemeleri(input.detay);
  if (rows.length === 0) return [];
  await validateSanatciIds(tx, ctx, rows.map((r) => r.cariId));

  const createdIds: number[] = [];
  for (const row of rows) {
    const created = await tx.sanatciOdemesi.create({
      data: {
        muzikProfilId: input.muzikProfilId,
        sanatciCariId: row.cariId,
        tarih: input.tarih,
        tutar: row.tutar,
        paraBirimi: input.paraBirimi,
        not: input.not,
        borclaraYansit: false,
        organizationId: ctx.orgId,
        userId: ctx.userId,
      },
      select: { id: true },
    });
    createdIds.push(created.id);
  }
  return createdIds;
}

async function syncMuzikGelirFromGelirDetay(
  tx: Prisma.TransactionClient,
  ctx: { userId: string; orgId: string },
  input: {
    odemeNotuId: number;
    existingMuzikGelirId: number | null;
    detay: DetayObject | null;
    baslik: string;
    tutar: number;
    paraBirimi: string;
    tarih: Date;
  },
  /** Yeni müzik profili sanatçısız oluştuysa flag set edilir (audit #5) */
  meta?: { yeniMuzikSanatcisiz?: string },
): Promise<DetayObject | null> {
  const org = await tx.organization.findUnique({
    where: { id: ctx.orgId },
    select: { modulMuzik: true },
  });
  const requested = isMuzikGeliriRequested(input.detay);

  if (!org?.modulMuzik || !requested) {
    if (input.existingMuzikGelirId) {
      await tx.muzikGelir
        .delete({
          where: { id: input.existingMuzikGelirId },
        })
        .catch(() => {});
    }
    return input.detay
      ? { ...input.detay, isMuzikGeliri: false, muzikGelirId: null }
      : input.detay;
  }

  const platform =
    typeof input.detay?.platform === "string" && input.detay.platform
      ? (input.detay.platform as MuzikMagaza)
      : null;
  let muzikProfilId = input.detay?.muzikProfilId
    ? Number(input.detay.muzikProfilId)
    : null;

  if (!muzikProfilId) {
    const yeniSarkiAdi =
      typeof input.detay?.yeniSarkiAdi === "string" &&
      input.detay.yeniSarkiAdi.trim()
        ? input.detay.yeniSarkiAdi.trim()
        : typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi.trim()
          ? input.detay.sarkiAdi.trim()
          : "";
    if (!yeniSarkiAdi) return input.detay;

    const extras = readMuzikProfilDetay(input.detay, [platform]);
    const sanatciIds = await validateSanatciIds(tx, ctx, extras.sanatciIds);
    const slug = await uniqueMuzikSlug(tx, ctx.orgId, slugify(yeniSarkiAdi));
    const created = await tx.muzikProfil.create({
      data: {
        isim: yeniSarkiAdi,
        slug,
        isbirlikciler: extras.isbirlikciler,
        magazalar: extras.magazalar,
        notlar: extras.notlar,
        organizationId: ctx.orgId,
        userId: ctx.userId,
        ...(sanatciIds.length > 0 && {
          sanatcilar: {
            create: sanatciIds.map((cariId) => ({ cariId })),
          },
        }),
      },
      select: { id: true },
    });
    muzikProfilId = created.id;
    if (meta && sanatciIds.length === 0) {
      meta.yeniMuzikSanatcisiz = yeniSarkiAdi;
    }
  }

  const muzik = await tx.muzikProfil.findFirst({
    where: { id: muzikProfilId, organizationId: ctx.orgId },
    select: { id: true, isim: true },
  });
  if (!muzik) return input.detay;

  const not =
    typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi
      ? input.detay.sarkiAdi
      : input.baslik;

  await applyMuzikProfilDetay(tx, ctx, muzik.id, input.detay, [platform]);
  const sanatciOdemesiIds = await createInlineSanatciOdemeleri(tx, ctx, {
    muzikProfilId: muzik.id,
    detay: input.detay,
    tarih: input.tarih,
    paraBirimi: input.paraBirimi,
    not,
  });

  const data = {
    muzikProfilId: muzik.id,
    tarih: input.tarih,
    platform,
    tutar: input.tutar,
    paraBirimi: input.paraBirimi,
    not,
    organizationId: ctx.orgId,
    userId: ctx.userId,
  };

  let muzikGelirId = input.existingMuzikGelirId;
  if (muzikGelirId) {
    await tx.muzikGelir.update({
      where: { id: muzikGelirId },
      data,
    });
  } else {
    const gelir = await tx.muzikGelir.create({
      data,
      select: { id: true },
    });
    muzikGelirId = gelir.id;
  }

  return {
    ...(input.detay ?? {}),
    isMuzikGeliri: true,
    muzikProfilId: muzik.id,
    sarkiAdi:
      typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi
        ? input.detay.sarkiAdi
        : muzik.isim,
    yeniSarkiAdi: null,
    muzikGelirId,
    ...(sanatciOdemesiIds.length > 0 && { sanatciOdemesiIds }),
  };
}

/**
 * Borç tarafında "Müzik harcaması olarak da kaydet" switch'i için sync.
 * OdemeNotu(Borc) kaydedildiğinde aynı transaction'da MuzikHarcama tablosuna
 * yansıtır (köprü FK'leri ile bağlı).
 */
async function syncMuzikHarcamaFromBorcDetay(
  tx: Prisma.TransactionClient,
  ctx: { userId: string; orgId: string },
  input: {
    odemeNotuId: number;
    existingMuzikHarcamaId: number | null;
    detay: DetayObject | null;
    baslik: string;
    tutar: number;
    paraBirimi: string;
    tarih: Date;
    cariId: number;
  },
  meta?: { yeniMuzikSanatcisiz?: string },
): Promise<DetayObject | null> {
  const org = await tx.organization.findUnique({
    where: { id: ctx.orgId },
    select: { modulMuzik: true },
  });
  const requested = isMuzikHarcamasiRequested(input.detay);

  if (!org?.modulMuzik || !requested) {
    if (input.existingMuzikHarcamaId) {
      await tx.muzikHarcama
        .delete({ where: { id: input.existingMuzikHarcamaId } })
        .catch(() => {});
    }
    return input.detay
      ? { ...input.detay, isMuzikHarcamasi: false, muzikHarcamaId: null }
      : input.detay;
  }

  let muzikProfilId = input.detay?.muzikProfilId
    ? Number(input.detay.muzikProfilId)
    : null;

  if (!muzikProfilId) {
    const yeniSarkiAdi =
      typeof input.detay?.yeniSarkiAdi === "string" &&
      input.detay.yeniSarkiAdi.trim()
        ? input.detay.yeniSarkiAdi.trim()
        : typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi.trim()
          ? input.detay.sarkiAdi.trim()
          : "";
    if (!yeniSarkiAdi) return input.detay;

    const extras = readMuzikProfilDetay(input.detay);
    const sanatciIds = await validateSanatciIds(tx, ctx, extras.sanatciIds);
    const slug = await uniqueMuzikSlug(tx, ctx.orgId, slugify(yeniSarkiAdi));
    const created = await tx.muzikProfil.create({
      data: {
        isim: yeniSarkiAdi,
        slug,
        isbirlikciler: extras.isbirlikciler,
        magazalar: extras.magazalar,
        notlar: extras.notlar,
        organizationId: ctx.orgId,
        userId: ctx.userId,
        ...(sanatciIds.length > 0 && {
          sanatcilar: {
            create: sanatciIds.map((cariId) => ({ cariId })),
          },
        }),
      },
      select: { id: true },
    });
    muzikProfilId = created.id;
    if (meta && sanatciIds.length === 0) {
      meta.yeniMuzikSanatcisiz = yeniSarkiAdi;
    }
  }

  const muzik = await tx.muzikProfil.findFirst({
    where: { id: muzikProfilId, organizationId: ctx.orgId },
    select: { id: true, isim: true },
  });
  if (!muzik) return input.detay;

  const kategori =
    typeof input.detay?.kategori === "string" && input.detay.kategori
      ? (input.detay.kategori as MuzikHarcamaKategori)
      : null;
  const not =
    typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi
      ? input.detay.sarkiAdi
      : input.baslik;

  await applyMuzikProfilDetay(tx, ctx, muzik.id, input.detay);
  const sanatciOdemesiIds = await createInlineSanatciOdemeleri(tx, ctx, {
    muzikProfilId: muzik.id,
    detay: input.detay,
    tarih: input.tarih,
    paraBirimi: input.paraBirimi,
    not,
  });

  /* Cari Harcama tipinde mi? Promoter olabilir, başkası da olabilir — promoterCariId olarak bağla */
  const cari = await tx.cari.findFirst({
    where: { id: input.cariId, organizationId: ctx.orgId },
    select: { tip: true, harcamaTuru: true },
  });
  const promoterCariId =
    cari?.tip === CariTipi.Harcama ? input.cariId : null;

  const data = {
    muzikProfilId: muzik.id,
    tarih: input.tarih,
    kategori,
    tutar: input.tutar,
    paraBirimi: input.paraBirimi,
    not,
    promoterCariId,
    odemeNotuId: input.odemeNotuId,
    organizationId: ctx.orgId,
    userId: ctx.userId,
  };

  let muzikHarcamaId = input.existingMuzikHarcamaId;
  if (muzikHarcamaId) {
    await tx.muzikHarcama.update({ where: { id: muzikHarcamaId }, data });
  } else {
    const harc = await tx.muzikHarcama.create({
      data,
      select: { id: true },
    });
    muzikHarcamaId = harc.id;
  }

  return {
    ...(input.detay ?? {}),
    isMuzikHarcamasi: true,
    muzikProfilId: muzik.id,
    sarkiAdi:
      typeof input.detay?.sarkiAdi === "string" && input.detay.sarkiAdi
        ? input.detay.sarkiAdi
        : muzik.isim,
    yeniSarkiAdi: null,
    muzikHarcamaId,
    ...(sanatciOdemesiIds.length > 0 && { sanatciOdemesiIds }),
  };
}

async function buildDetayForOdemeNotu(
  yon: string,
  cariId: number,
  organizationId: string,
  rawDetay: Record<string, unknown>,
): Promise<Prisma.InputJsonValue | null> {
  if (yon === OdemeYonu.Alacak) {
    const parsed = detayGelirSchema.safeParse(rawDetay);
    if (!parsed.success) return null;
    const hasValue = Object.values(parsed.data).some(hasMeaningfulDetayValue);
    return hasValue ? (parsed.data as Prisma.InputJsonValue) : null;
  }

  /* Borç + müzik harcaması switch açık → cari Harcama olmasa bile detay tut */
  if (
    rawDetay.isMuzikHarcamasi === "true" ||
    rawDetay.isMuzikHarcamasi === true
  ) {
    const parsed = detayBorcMuzikSchema.safeParse(rawDetay);
    if (parsed.success) {
      return parsed.data as Prisma.InputJsonValue;
    }
  }

  const cari = await db.cari.findFirst({
    where: { id: cariId, organizationId },
    select: { tip: true, harcamaTuru: true },
  });
  if (!cari || cari.tip !== CariTipi.Harcama || !cari.harcamaTuru) {
    return null;
  }
  if (Object.keys(rawDetay).length === 0) return null;

  switch (cari.harcamaTuru) {
    case HarcamaTuru.Promosyon: {
      const parsed = detayPromosyonSchema.safeParse(rawDetay);
      return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
    }
    case HarcamaTuru.Ticaret: {
      const parsed = detayTicaretSchema.safeParse(rawDetay);
      return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
    }
    case HarcamaTuru.Avans: {
      const parsed = detayAvansSchema.safeParse(rawDetay);
      return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
    }
    default:
      return null;
  }
}

export async function createOdemeNotu(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getOrgContext();

  /* Inline yeni profil: cariId boş + yeniCariAdi doluysa, önce Cari oluştur,
     onun id'sini formData'ya yaz, schema parse normal akışına devam et. */
  const cariIdRaw = formData.get("cariId");
  const yeniCariAdi = formData.get("yeniCariAdi");
  if (
    (!cariIdRaw || cariIdRaw === "") &&
    typeof yeniCariAdi === "string" &&
    yeniCariAdi.trim().length >= 2
  ) {
    const yonRaw = formData.get("yon");
    const defaultTip =
      yonRaw === OdemeYonu.Alacak ? CariTipi.Musteri : CariTipi.Tedarikci;
    const existingCount = await db.cari.count({
      where: { organizationId: ctx.orgId },
    });
    const kod = `CR-${String(existingCount + 1).padStart(3, "0")}`;
    const created = await db.cari.create({
      data: {
        kod,
        unvan: yeniCariAdi.trim(),
        tip: defaultTip,
        aktif: true,
        userId: ctx.userId,
        organizationId: ctx.orgId,
      },
      select: { id: true, unvan: true },
    });
    formData.set("cariId", String(created.id));
    await logAction({
      userId: ctx.userId,
      organizationId: ctx.orgId,
      islem: "create",
      entity: "Cari",
      entityId: String(created.id),
      ozet: `Inline profil eklendi: ${created.unvan} (${defaultTip})`,
    });
  }

  const parsed = odemeNotuSchema.safeParse(fdToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const cari = await db.cari.findFirst({
    where: { id: parsed.data.cariId, organizationId: ctx.orgId },
    select: { id: true },
  });
  if (!cari) return { ok: false, error: "Profil bulunamadı" };

  const rawDetay = readDetayFromFormData(formData);
  const detay = await buildDetayForOdemeNotu(
    parsed.data.yon,
    parsed.data.cariId,
    ctx.orgId,
    rawDetay,
  );

  const { detay: _ignored, ...rest } = parsed.data;
  void _ignored;

  const meta: { yeniMuzikSanatcisiz?: string } = {};
  let createdId = 0;

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.odemeNotu.create({
        data: {
          ...rest,
          detay: detay ?? Prisma.JsonNull,
          userId: ctx.userId,
          organizationId: ctx.orgId,
        },
        select: { id: true },
      });
      createdId = created.id;

      let syncedDetay: DetayObject | null = null;
      if (parsed.data.yon === OdemeYonu.Alacak) {
        syncedDetay = await syncMuzikGelirFromGelirDetay(
          tx,
          ctx,
          {
            odemeNotuId: created.id,
            existingMuzikGelirId: null,
            detay: detay as DetayObject | null,
            baslik: parsed.data.baslik,
            tutar: parsed.data.tutar,
            paraBirimi: parsed.data.paraBirimi,
            tarih: parsed.data.vadeTarihi,
          },
          meta,
        );
      } else {
        syncedDetay = await syncMuzikHarcamaFromBorcDetay(
          tx,
          ctx,
          {
            odemeNotuId: created.id,
            existingMuzikHarcamaId: null,
            detay: detay as DetayObject | null,
            baslik: parsed.data.baslik,
            tutar: parsed.data.tutar,
            paraBirimi: parsed.data.paraBirimi,
            tarih: parsed.data.vadeTarihi,
            cariId: parsed.data.cariId,
          },
          meta,
        );
      }

      if (syncedDetay) {
        await tx.odemeNotu.update({
          where: { id: created.id },
          data: { detay: syncedDetay as Prisma.InputJsonValue },
        });
      }
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kayıt oluşturulamadı",
    };
  }

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "OdemeNotu",
    ozet: `${parsed.data.yon === OdemeYonu.Alacak ? "Alacak" : "Borç"} eklendi: ${parsed.data.baslik}`,
  });

  revalidatePath("/uygulama/alacaklar");
  revalidatePath("/uygulama/borclar");
  revalidatePath("/uygulama/muzik-odemeleri");
  revalidatePath("/uygulama");

  return {
    ok: true,
    data: {
      id: createdId,
      ...(meta.yeniMuzikSanatcisiz && {
        warning: `"${meta.yeniMuzikSanatcisiz}" şarkısı sanatçısız oluşturuldu — Müzik Ödemeleri'nden sanatçı ekleyebilirsiniz`,
      }),
    },
  };
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
    select: { id: true, baslik: true, detay: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };

  const rawDetay = readDetayFromFormData(formData);
  const detay = await buildDetayForOdemeNotu(
    parsed.data.yon,
    parsed.data.cariId,
    ctx.orgId,
    rawDetay,
  );

  const { detay: _ignored, ...rest } = parsed.data;
  void _ignored;

  const meta: { yeniMuzikSanatcisiz?: string } = {};

  try {
    await db.$transaction(async (tx) => {
      let syncedDetay: DetayObject | null = null;
      if (parsed.data.yon === OdemeYonu.Alacak) {
        syncedDetay = await syncMuzikGelirFromGelirDetay(
          tx,
          ctx,
          {
            odemeNotuId: id,
            existingMuzikGelirId: readMuzikGelirId(existing.detay),
            detay: detay as DetayObject | null,
            baslik: parsed.data.baslik,
            tutar: parsed.data.tutar,
            paraBirimi: parsed.data.paraBirimi,
            tarih: parsed.data.vadeTarihi,
          },
          meta,
        );
      } else {
        syncedDetay = await syncMuzikHarcamaFromBorcDetay(
          tx,
          ctx,
          {
            odemeNotuId: id,
            existingMuzikHarcamaId: readMuzikHarcamaId(existing.detay),
            detay: detay as DetayObject | null,
            baslik: parsed.data.baslik,
            tutar: parsed.data.tutar,
            paraBirimi: parsed.data.paraBirimi,
            tarih: parsed.data.vadeTarihi,
            cariId: parsed.data.cariId,
          },
          meta,
        );
      }

      await tx.odemeNotu.update({
        where: { id },
        data: {
          ...rest,
          detay:
            syncedDetay != null
              ? (syncedDetay as Prisma.InputJsonValue)
              : (detay ?? Prisma.JsonNull),
        },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kayıt güncellenemedi",
    };
  }

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
  revalidatePath("/uygulama/muzik-odemeleri");
  revalidatePath("/uygulama");

  if (meta.yeniMuzikSanatcisiz) {
    return {
      ok: true,
      data: {
        warning: `"${meta.yeniMuzikSanatcisiz}" şarkısı sanatçısız oluşturuldu — Müzik Ödemeleri'nden sanatçı ekleyebilirsiniz`,
      },
    };
  }
  return { ok: true };
}

export async function deleteOdemeNotu(id: number): Promise<ActionResult> {
  const ctx = await getOrgContext();
  const existing = await db.odemeNotu.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, baslik: true, detay: true },
  });
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };
  const muzikGelirId = readMuzikGelirId(existing.detay);
  const muzikHarcamaId = readMuzikHarcamaId(existing.detay);
  await db.$transaction(async (tx) => {
    if (muzikGelirId) {
      await tx.muzikGelir.delete({ where: { id: muzikGelirId } }).catch(() => {});
    }
    if (muzikHarcamaId) {
      await tx.muzikHarcama
        .delete({ where: { id: muzikHarcamaId } })
        .catch(() => {});
    }
    await tx.odemeNotu.delete({ where: { id } });
  });

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
  revalidatePath("/uygulama/muzik-odemeleri");
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

  await db.$transaction((tx) =>
    settleOdemeNotu(tx, ctx, {
      id: notu.id,
      cariId: notu.cariId,
      yon: notu.yon,
      baslik: notu.baslik,
      tutar: notu.tutar,
      odenenTutar: notu.odenenTutar,
      paraBirimi: notu.paraBirimi,
      odemeTarihi: notu.odemeTarihi,
      eklenecek,
    }),
  );

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
