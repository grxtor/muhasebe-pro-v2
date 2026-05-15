"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn } from "@/auth";

const registerSchema = z
  .object({
    adSoyad: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
    sirketAdi: z.string().max(200).optional().nullable(),
    email: z
      .string()
      .email("Geçerli bir e-posta giriniz")
      .transform((e) => e.toLowerCase()),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Şifreler eşleşmiyor",
  });

export type RegisterState = { error?: string | null };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    adSoyad: formData.get("adSoyad"),
    sirketAdi: formData.get("sirketAdi") || null,
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form geçersiz" };
  }

  const exists = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (exists) {
    return { error: "Bu e-posta zaten kayıtlı" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.adSoyad,
      adSoyad: parsed.data.adSoyad,
      sirketAdi: parsed.data.sirketAdi || null,
      password: passwordHash,
    },
  });

  // Kayıt sonrası otomatik giriş
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/uygulama",
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Hesap oluşturuldu ama otomatik giriş başarısız." };
    }
    throw err;
  }
}
