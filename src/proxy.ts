import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Edge proxy (Next.js 16 — `middleware` rename'i).
 *
 * Sadece `auth.config.ts`'i kullanır; Prisma ve bcrypt'e dokunmaz.
 * Korunan path'ler `auth.config.ts`'in `authorized` callback'inde tanımlı.
 */
const { auth: authProxy } = NextAuth(authConfig);

export default authProxy;

export const config = {
  matcher: [
    // Statik dosyalar + API auth endpoint'i hariç tüm path'leri yakala
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|images).*)",
  ],
};
