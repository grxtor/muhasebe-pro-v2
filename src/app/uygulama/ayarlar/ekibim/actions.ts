"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { OrgRole } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ============================================================
   ÜYE EKLEME (direkt — davet flow'u sonra)
   ============================================================ */

const addMemberSchema = z.object({
  adSoyad: z.string().min(2).max(200),
  email: z.string().email().transform((e) => e.toLowerCase()),
  sifre: z.string().min(6, "Şifre en az 6 karakter"),
  role: z.enum([
    OrgRole.Admin,
    OrgRole.Muhasebeci,
    OrgRole.Goruntuleyici,
  ]),
});

export async function addMember(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(OrgRole.Owner);
  const parsed = addMemberSchema.safeParse({
    adSoyad: formData.get("adSoyad"),
    email: formData.get("email"),
    sifre: formData.get("sifre"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const data = parsed.data;

  // Email zaten kullanılıyor mu?
  let user = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true, adSoyad: true },
  });

  if (user) {
    // Bu kullanıcı zaten şirkette üye mi?
    const existingMember = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.orgId,
          userId: user.id,
        },
      },
    });
    if (existingMember) {
      return { ok: false, error: "Bu kullanıcı zaten şirkette üye" };
    }
  } else {
    // Yeni kullanıcı oluştur
    const hash = await bcrypt.hash(data.sifre, 12);
    user = await db.user.create({
      data: {
        email: data.email,
        adSoyad: data.adSoyad,
        name: data.adSoyad,
        password: hash,
        currentOrgId: ctx.orgId,
      },
      select: { id: true, adSoyad: true },
    });
  }

  await db.organizationMember.create({
    data: {
      organizationId: ctx.orgId,
      userId: user.id,
      role: data.role,
      invitedBy: ctx.userId,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "OrganizationMember",
    entityId: user.id,
    ozet: `Şirkete üye eklendi: ${data.adSoyad} (${data.email}) — rol: ${data.role}`,
  });

  revalidatePath("/uygulama/ayarlar/ekibim");
  return { ok: true };
}

export async function updateMemberRole(
  memberId: string,
  role: OrgRole,
): Promise<ActionResult> {
  const ctx = await requireRole(OrgRole.Owner);
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
    include: { user: { select: { adSoyad: true, email: true } } },
  });
  if (!member) return { ok: false, error: "Üye bulunamadı" };
  if (member.role === OrgRole.Owner) {
    return { ok: false, error: "Owner rolü değiştirilemez" };
  }
  if (role === OrgRole.Owner) {
    return {
      ok: false,
      error: "Owner rolü atama için 'Sahipliği Devret' kullanın",
    };
  }

  await db.organizationMember.update({
    where: { id: memberId },
    data: { role },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "OrganizationMember",
    entityId: member.userId,
    ozet: `${member.user.adSoyad ?? member.user.email} rolü ${role} olarak güncellendi`,
  });

  revalidatePath("/uygulama/ayarlar/ekibim");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const ctx = await requireRole(OrgRole.Owner);
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
    include: { user: { select: { id: true, adSoyad: true, email: true } } },
  });
  if (!member) return { ok: false, error: "Üye bulunamadı" };
  if (member.role === OrgRole.Owner) {
    return { ok: false, error: "Owner çıkarılamaz" };
  }
  if (member.userId === ctx.userId) {
    return { ok: false, error: "Kendinizi çıkaramazsınız" };
  }

  await db.organizationMember.delete({ where: { id: memberId } });

  // Eğer kullanıcının currentOrgId'si bu org idiyse null'la
  await db.user.updateMany({
    where: { id: member.userId, currentOrgId: ctx.orgId },
    data: { currentOrgId: null },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "OrganizationMember",
    entityId: member.userId,
    ozet: `${member.user.adSoyad ?? member.user.email} şirketten çıkarıldı`,
  });

  revalidatePath("/uygulama/ayarlar/ekibim");
  return { ok: true };
}

export async function resetMemberPassword(
  memberId: string,
  yeniSifre: string,
): Promise<ActionResult> {
  const ctx = await requireRole(OrgRole.Owner);
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
    include: { user: { select: { id: true, email: true, adSoyad: true } } },
  });
  if (!member) return { ok: false, error: "Üye bulunamadı" };
  if (member.userId === ctx.userId) {
    return { ok: false, error: "Kendi şifrenizi Profil ayarlarından değiştirin" };
  }
  if (yeniSifre.length < 6) {
    return { ok: false, error: "Şifre en az 6 karakter olmalı" };
  }

  const hash = await bcrypt.hash(yeniSifre, 12);
  await db.user.update({
    where: { id: member.userId },
    data: { password: hash },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "update",
    entity: "User",
    entityId: member.userId,
    ozet: `${member.user.adSoyad ?? member.user.email} şifresi sıfırlandı`,
  });

  return { ok: true };
}
