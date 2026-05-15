import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Dosya yükleme altyapısı.
 *
 * UPLOAD_DIR env var — dev'de `./uploads/`, production'da `/app/uploads/`
 * (Docker volume). Her dosya kullanıcının kendi alt-klasörüne yazılır:
 *   {UPLOAD_DIR}/{kategori}/{userId}/{timestamp}-{uuid}-{safeName}
 *
 * Bu yapı:
 *   - Path traversal'a kapalı (UPLOAD_DIR'in dışına çıkamaz)
 *   - Aynı isimli dosya çakışmaları olmaz (timestamp+uuid)
 *   - Kullanıcı bazında izolasyon (auth check serve route'ta)
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export const FILE_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10 MB
  dekontMimes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ],
  logoMimes: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/webp",
  ],
} as const;

export interface SavedFile {
  /** DB'de tutulan göreceli yol (UPLOAD_DIR'e göre) — örn: "dekontlar/USER_ID/1700000000-xxx-fatura.pdf" */
  relativePath: string;
  /** Public erişim URL'i — örn: "/api/files/dekontlar/USER_ID/1700000000-xxx-fatura.pdf" */
  publicUrl: string;
  /** Orijinal dosya adı (görüntülemede kullanılır) */
  originalName: string;
  size: number;
  mimeType: string;
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

/**
 * `UPLOAD_DIR/{kategori}/{userId}/...` altına yazar.
 * `kategori`: "dekontlar" | "logolar" | …
 */
export async function saveFile(
  file: File,
  kategori: string,
  userId: string,
  allowedMimes?: readonly string[],
): Promise<SavedFile> {
  if (file.size <= 0) {
    throw new Error("Dosya boş");
  }
  if (file.size > FILE_LIMITS.maxBytes) {
    throw new Error(
      `Dosya çok büyük (max ${Math.floor(FILE_LIMITS.maxBytes / 1024 / 1024)} MB)`,
    );
  }
  if (allowedMimes && !allowedMimes.includes(file.type)) {
    throw new Error(`Desteklenmeyen dosya tipi: ${file.type || "bilinmiyor"}`);
  }

  const userDir = path.join(UPLOAD_DIR, kategori, userId);
  await fs.mkdir(userDir, { recursive: true });

  const safe = sanitizeName(file.name || "dosya");
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
  const fullPath = path.join(userDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);

  const relativePath = path.posix.join(kategori, userId, filename);
  return {
    relativePath,
    publicUrl: `/api/files/${relativePath}`,
    originalName: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

/**
 * `relativePath` → DB'de saklanan değer.
 * Auth kontrolü çağıran fonksiyonun sorumluluğunda.
 */
export async function deleteFile(relativePath: string): Promise<void> {
  // Güvenlik: relative path UPLOAD_DIR dışına çıkmasın
  const fullPath = path.resolve(path.join(UPLOAD_DIR, relativePath));
  const rootPath = path.resolve(UPLOAD_DIR);
  if (!fullPath.startsWith(rootPath + path.sep) && fullPath !== rootPath) {
    throw new Error("Geçersiz dosya yolu");
  }
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    // Dosya zaten yoksa sessiz geç
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/**
 * Dosyayı okur — serve route için.
 * Auth check çağıran fonksiyonun sorumluluğunda.
 */
export async function readFile(relativePath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const fullPath = path.resolve(path.join(UPLOAD_DIR, relativePath));
  const rootPath = path.resolve(UPLOAD_DIR);
  if (!fullPath.startsWith(rootPath + path.sep) && fullPath !== rootPath) {
    throw new Error("Geçersiz dosya yolu");
  }
  const buffer = await fs.readFile(fullPath);
  // MIME tipi extension'dan tahmin et
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  return { buffer, mimeType };
}

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};
