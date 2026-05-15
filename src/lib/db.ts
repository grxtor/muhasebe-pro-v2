import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton — Next.js hot-reload sırasında client kopyalanmasın diye
 * global'e bağlanmış instance.
 *
 * Production'da tek instance, dev'de HMR yenilemesi global referansı kullanır.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
