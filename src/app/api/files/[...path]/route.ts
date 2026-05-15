import { NextResponse } from "next/server";
import { readFile } from "@/lib/files";
import { getCurrentSession } from "@/lib/auth-helpers";

/**
 * Authenticated file serve.
 *
 * URL: /api/files/{kategori}/{userId}/{filename}
 *
 * Auth kuralı: dosyanın userId'si == oturumdaki userId olmalı.
 * Bu sayede sadece kullanıcı kendi dosyalarına erişir.
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

  const [_kategori, userIdFromPath, ..._rest] = segments;
  if (userIdFromPath !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const relativePath = segments.join("/");

  try {
    const { buffer, mimeType } = await readFile(relativePath);
    // Resimler ve PDF'ler inline gösterilsin
    const safeMime = mimeType.startsWith("image/") || mimeType === "application/pdf"
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
