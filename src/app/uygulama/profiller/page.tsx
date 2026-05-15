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
  searchParams: Promise<{ q?: string; tip?: string }>;
}) {
  const userId = await getUserId();
  const { q = "", tip = "" } = await searchParams;

  const profiller = await db.cari.findMany({
    where: {
      userId,
      ...(tip ? { tip: tip as never } : {}),
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
    select: {
      id: true,
      kod: true,
      unvan: true,
      tip: true,
      telefon: true,
      email: true,
      sehir: true,
      vergiNo: true,
      tcKimlikNo: true,
      vergiDairesi: true,
      adres: true,
      acilisBakiyesi: true,
      notlar: true,
      aktif: true,
    },
  });

  const sonrakiKod = await nextProfilKodu();

  // Decimal alanları string'e çeviriyoruz, çünkü client'a Decimal nesnesi gönderilemez.
  const serialized = profiller.map((p) => ({
    ...p,
    acilisBakiyesi: p.acilisBakiyesi.toString(),
  }));

  return (
    <ProfilList
      profiller={serialized}
      sonrakiKod={sonrakiKod}
      icon={<Users size={20} />}
    />
  );
}
