import { auth } from "@/auth";

/**
 * Server-side aktif kullanıcının id'sini döner.
 * Yoksa hata fırlatır — Server Actions için varsayılan koruma.
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Yetkisiz erişim");
  }
  return session.user.id;
}

/**
 * İsteğe bağlı session getirici — yoksa null döner, hata atmaz.
 */
export async function getCurrentSession() {
  return auth();
}
