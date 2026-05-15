import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js yapılandırması.
 *
 * Bu dosya proxy.ts'de de kullanılır, bu yüzden Prisma/bcryptjs gibi
 * Node-only kütüphaneler buraya GİREMEZ. Credentials provider'ı `auth.ts`
 * içinde tanımlanır.
 *
 * Şimdilik sadece email/şifre. Google OAuth ileride eklenecek.
 */
export default {
  providers: [],
  pages: {
    signIn: "/giris",
    error: "/giris",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/giris", "/kayit"];
      const isOnPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p));
      const isOnRoot = nextUrl.pathname === "/";

      // Korunmuş alanlar: /uygulama/*
      const isOnApp = nextUrl.pathname.startsWith("/uygulama");

      if (isOnApp) return isLoggedIn;

      // Giriş yapmışken /giris veya /kayit'a giderse → /uygulama'ya yönlendir
      if (isLoggedIn && (isOnPublic || isOnRoot)) {
        return Response.redirect(new URL("/uygulama", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
