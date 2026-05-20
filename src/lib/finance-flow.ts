import { Prisma } from "@prisma/client";
import {
  FaturaDurumu,
  FaturaYonu,
  HareketTipi,
  OdemeDurumu,
  OdemeYonu,
  type FaturaYonu as FaturaYonuValue,
  type OdemeYonu as OdemeYonuValue,
} from "@/lib/enums";

type Tx = Prisma.TransactionClient;

export interface FinanceContext {
  userId: string;
  orgId: string;
}

export function hesaplaFaturaTutarlari(tutar: number, kdvOrani: number) {
  const kdvTutari = +(tutar * (kdvOrani / 100)).toFixed(2);
  const toplamTutar = +(tutar + kdvTutari).toFixed(2);
  return { kdvTutari, toplamTutar };
}

export function faturaYonuToOdemeYonu(yon: string) {
  return yon === FaturaYonu.Gonderilen ? OdemeYonu.Alacak : OdemeYonu.Borc;
}

export function odemeYonuToHareketTipi(yon: string) {
  return yon === OdemeYonu.Alacak ? HareketTipi.Alacak : HareketTipi.Borc;
}

export async function createOdemeNotuForFatura(
  tx: Tx,
  ctx: FinanceContext,
  input: {
    faturaId: number;
    cariId: number;
    faturaNo: string;
    faturaYonu: string;
    isAciklamasi: string;
    toplamTutar: number | Prisma.Decimal;
    paraBirimi: string;
    vadeTarihi: Date;
  },
) {
  return tx.odemeNotu.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: input.cariId,
      yon: faturaYonuToOdemeYonu(input.faturaYonu),
      baslik: `Fatura ${input.faturaNo}`,
      aciklama: input.isAciklamasi,
      tutar: input.toplamTutar,
      paraBirimi: input.paraBirimi,
      vadeTarihi: input.vadeTarihi,
      durum: OdemeDurumu.Beklemede,
      faturaId: input.faturaId,
    },
  });
}

export async function settleOdemeNotu(
  tx: Tx,
  ctx: FinanceContext,
  input: {
    id: number;
    cariId: number;
    yon: OdemeYonuValue;
    baslik: string;
    tutar: number | Prisma.Decimal;
    odenenTutar: number | Prisma.Decimal;
    paraBirimi: string;
    odemeTarihi: Date | null;
    eklenecek: number;
  },
) {
  const yeniOdenen = Number(input.odenenTutar) + input.eklenecek;
  const tamamlandi = yeniOdenen >= Number(input.tutar);

  await tx.odemeNotu.update({
    where: { id: input.id },
    data: {
      odenenTutar: yeniOdenen,
      durum: tamamlandi ? OdemeDurumu.Odendi : OdemeDurumu.KismiOdendi,
      odemeTarihi: tamamlandi ? new Date() : input.odemeTarihi,
    },
  });

  await tx.hareket.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: input.cariId,
      tarih: new Date(),
      tip: odemeYonuToHareketTipi(input.yon),
      tutar: input.eklenecek,
      paraBirimi: input.paraBirimi,
      aciklama: `${input.baslik} - ${
        input.yon === OdemeYonu.Alacak ? "Tahsilat" : "Ödeme"
      }${tamamlandi ? " (tamamlandı)" : " (kısmi)"}`,
    },
  });

  return { tamamlandi, yeniOdenen };
}

export async function nextFaturaNoForOrg(
  tx: Tx,
  organizationId: string,
  tarih = new Date(),
) {
  const yil = tarih.getFullYear();
  const count = await tx.fatura.count({ where: { organizationId } });
  return `${yil}-${String(count + 1).padStart(4, "0")}`;
}

export async function createFaturaFromTemplate(
  tx: Tx,
  ctx: FinanceContext,
  input: {
    cariId: number;
    yon: FaturaYonuValue;
    faturaNo: string;
    tarih: Date;
    vadeTarihi: Date;
    isAciklamasi: string;
    tutar: number | Prisma.Decimal;
    kdvOrani: number | Prisma.Decimal;
    kdvTutari: number;
    toplamTutar: number;
    paraBirimi: string;
  },
) {
  const fatura = await tx.fatura.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      cariId: input.cariId,
      yon: input.yon,
      faturaNo: input.faturaNo,
      tarih: input.tarih,
      vadeTarihi: input.vadeTarihi,
      isAciklamasi: input.isAciklamasi,
      tutar: input.tutar,
      kdvOrani: input.kdvOrani,
      kdvTutari: input.kdvTutari,
      toplamTutar: input.toplamTutar,
      paraBirimi: input.paraBirimi,
      durum: FaturaDurumu.Beklemede,
    },
  });

  await createOdemeNotuForFatura(tx, ctx, {
    faturaId: fatura.id,
    cariId: input.cariId,
    faturaNo: input.faturaNo,
    faturaYonu: input.yon,
    isAciklamasi: input.isAciklamasi,
    toplamTutar: input.toplamTutar,
    paraBirimi: input.paraBirimi,
    vadeTarihi: input.vadeTarihi,
  });

  return fatura;
}
