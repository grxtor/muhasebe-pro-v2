import { NextResponse } from "next/server";
import { readFile } from "@/lib/files";
import { getCurrentSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

/**
 * Authenticated file serve.
 *
 * URL'ler:
 *   /api/files/dekontlar/{orgId}/{filename}
 *   /api/files/logolar/{orgId}/{filename}
 *   /api/files/dekontlar/{userId}/{filename}   (eski, geriye uyumluluk)
 *   /api/files/logolar/{userId}/{filename}     (eski, geriye uyumluluk)
 *
 * Auth: dosya kullanıcının üyesi olduğu org veya kendi user-bazlı klasöründe
 * ise serve edilir; aksi halde 403.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  if (!segments || segments.length < 3) {
    return new NextResponse("Geçersiz yol", { status: 400 });
  }

  const [, ownerIdFromPath] = segments;

  // ownerId ya bir orgId (kullanıcı üyesi olmalı) ya da userId (kendisi olmalı)
  const isOwnUser = ownerIdFromPath === session.user.id;
  let isMember = false;
  if (!isOwnUser) {
    const membership = await db.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: ownerIdFromPath },
      select: { id: true },
    });
    isMember = !!membership;
  }

  if (!isOwnUser && !isMember) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const relativePath = segments.join("/");

  try {
    const { buffer, mimeType } = await readFile(relativePath);
    const safeMime =
      mimeType.startsWith("image/") || mimeType === "application/pdf"
        ? mimeType
        : "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": safeMime,
        "cache-control": "private, max-age=60",
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Bulunamadı", { status: 404 });
    }
    console.error("[files] read error:", err);
    return new NextResponse("Sunucu hatası", { status: 500 });
  }
}
