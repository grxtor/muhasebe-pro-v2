"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export type LoginState = { error?: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/uygulama",
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı" };
    }
    // signIn redirect'i throw eder — yeniden fırlatmalıyız
    throw err;
  }
}

export async function googleLoginAction(): Promise<void> {
  await signIn("google", { redirectTo: "/uygulama" });
}
