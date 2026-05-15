import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth-helpers";

/**
 * Internal: kod'a göre Cari id'sini döner.
 * Profil dialog'unda yeni profil ekledikten sonra id'ye ulaşmak için.
 */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const kod = searchParams.get("kod");
  if (!kod) return NextResponse.json({ error: "kod required" }, { status: 400 });

  const cari = await db.cari.findFirst({
    where: { userId: session.user.id, kod },
    select: { id: true },
  });
  return NextResponse.json(cari);
}
