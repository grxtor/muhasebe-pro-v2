import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { ProfilList } from "./profil-list";
import { nextProfilKodu } from "./actions";

export const metadata = {
  title: "Profiller",
};

export const dynamic = "force-dynamic";

export default async function ProfillerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tip?: string; etiket?: string }>;
}) {
  const userId = await getUserId();
  const { q = "", tip = "", etiket = "" } = await searchParams;
  const etiketId = etiket ? Number(etiket) : 0;

  const [profiller, tumEtiketler] = await Promise.all([
    db.cari.findMany({
      where: {
        userId,
        ...(tip ? { tip: tip as never } : {}),
        ...(etiketId > 0
          ? { etiketler: { some: { tagId: etiketId } } }
          : {}),
        ...(q
          ? {
              OR: [
                { unvan: { contains: q, mode: "insensitive" } },
                { kod: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { telefon: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { unvan: "asc" },
      include: {
        etiketler: {
          include: {
            tag: { select: { id: true, ad: true, renk: true } },
          },
        },
      },
    }),
    db.tag.findMany({
      where: { userId },
      orderBy: { ad: "asc" },
      select: { id: true, ad: true, renk: true },
    }),
  ]);

  const sonrakiKod = await nextProfilKodu();

  const serialized = profiller.map((p) => ({
    id: p.id,
    kod: p.kod,
    unvan: p.unvan,
    tip: p.tip,
    telefon: p.telefon,
    email: p.email,
    sehir: p.sehir,
    vergiNo: p.vergiNo,
    tcKimlikNo: p.tcKimlikNo,
    vergiDairesi: p.vergiDairesi,
    adres: p.adres,
    acilisBakiyesi: p.acilisBakiyesi.toString(),
    notlar: p.notlar,
    aktif: p.aktif,
    etiketler: p.etiketler.map((e) => e.tag),
  }));

  return (
    <ProfilList
      profiller={serialized}
      sonrakiKod={sonrakiKod}
      tumEtiketler={tumEtiketler}
      icon={<Users size={20} />}
    />
  );
}
