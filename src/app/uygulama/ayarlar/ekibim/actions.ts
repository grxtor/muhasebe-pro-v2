"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { logAction } from "@/lib/audit";
import { OrgRole } from "@/lib/org";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** AUTH_URL veya request origin'inden mutlak davet URL'i oluşturur */
async function buildInviteUrl(token: string): Promise<string> {
  if (process.env.AUTH_URL) {
    return `${process.env.AUTH_URL.replace(/\/$/, "")}/davet/${token}`;
  }
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/davet/${token}`;
}

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

/* ============================================================
   DAVET LİNKLERİ — token üret, /davet/[token] ile kabul edilir
   ============================================================ */

const inviteSchema = z.object({
  email: z.string().email("Geçerli e-posta giriniz").transform((e) => e.toLowerCase()),
  role: z.enum([OrgRole.Admin, OrgRole.Muhasebeci, OrgRole.Goruntuleyici]),
});

const INVITE_DAYS = 7;

export async function createInvitation(
  formData: FormData,
): Promise<ActionResult<{ url: string; token: string; expiresAt: string }>> {
  const ctx = await requireRole(OrgRole.Owner);
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }
  const { email, role } = parsed.data;

  // Bu email zaten şirket üyesi mi?
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.orgId,
          userId: existingUser.id,
        },
      },
    });
    if (member) {
      return { ok: false, error: "Bu kullanıcı zaten şirkette üye" };
    }
  }

  // Aktif (kabul edilmemiş, süresi geçmemiş) bir davet var mı?
  const aktif = await db.invitation.findFirst({
    where: {
      organizationId: ctx.orgId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (aktif) {
    const url = await buildInviteUrl(aktif.token);
    return {
      ok: true,
      data: {
        url,
        token: aktif.token,
        expiresAt: aktif.expiresAt.toISOString(),
      },
    };
  }

  // Yeni davet üret
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);

  await db.invitation.create({
    data: {
      organizationId: ctx.orgId,
      email,
      role,
      token,
      invitedBy: ctx.userId,
      expiresAt,
    },
  });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "create",
    entity: "Invitation",
    ozet: `Davet gönderildi: ${email} — rol: ${role}`,
  });

  const url = await buildInviteUrl(token);
  revalidatePath("/uygulama/ayarlar/ekibim");
  return {
    ok: true,
    data: { url, token, expiresAt: expiresAt.toISOString() },
  };
}

export async function cancelInvitation(id: string): Promise<ActionResult> {
  const ctx = await requireRole(OrgRole.Owner);
  const inv = await db.invitation.findFirst({
    where: { id, organizationId: ctx.orgId },
  });
  if (!inv) return { ok: false, error: "Davet bulunamadı" };
  if (inv.acceptedAt) {
    return { ok: false, error: "Davet zaten kabul edilmiş" };
  }

  await db.invitation.delete({ where: { id } });

  await logAction({
    userId: ctx.userId,
    organizationId: ctx.orgId,
    islem: "delete",
    entity: "Invitation",
    ozet: `Davet iptal edildi: ${inv.email}`,
  });

  revalidatePath("/uygulama/ayarlar/ekibim");
  return { ok: true };
}

/** Public — davet kabul. Auth gerektirmez. */
const acceptSchema = z.object({
  token: z.string().min(1),
  adSoyad: z.string().min(2).max(200).optional().or(z.literal("")),
  sifre: z.string().min(6, "Şifre en az 6 karakter").optional().or(z.literal("")),
});

export async function acceptInvitation(
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    adSoyad: formData.get("adSoyad") ?? "",
    sifre: formData.get("sifre") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz" };
  }

  const inv = await db.invitation.findUnique({
    where: { token: parsed.data.token },
    include: { organization: { select: { ad: true } } },
  });
  if (!inv) return { ok: false, error: "Davet bulunamadı veya geçersiz" };
  if (inv.acceptedAt) {
    return { ok: false, error: "Bu davet zaten kabul edilmiş" };
  }
  if (inv.expiresAt < new Date()) {
    return { ok: false, error: "Davetin süresi dolmuş" };
  }

  // Kullanıcı var mı?
  let user = await db.user.findUnique({
    where: { email: inv.email },
    select: { id: true, adSoyad: true },
  });

  if (!user) {
    // Yeni kullanıcı — ad/şifre zorunlu
    if (!parsed.data.adSoyad || !parsed.data.sifre) {
      return {
        ok: false,
        error: "Yeni hesap için ad soyad ve şifre gerekli",
      };
    }
    const hash = await bcrypt.hash(parsed.data.sifre, 12);
    user = await db.user.create({
      data: {
        email: inv.email,
        adSoyad: parsed.data.adSoyad,
        name: parsed.data.adSoyad,
        password: hash,
        currentOrgId: inv.organizationId,
      },
      select: { id: true, adSoyad: true },
    });
  }

  // Zaten üye olabilir mi? (race condition)
  const existing = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: inv.organizationId,
        userId: user.id,
      },
    },
  });
  if (!existing) {
    await db.organizationMember.create({
      data: {
        organizationId: inv.organizationId,
        userId: user.id,
        role: inv.role,
        invitedBy: inv.invitedBy,
      },
    });
  }

  await db.invitation.update({
    where: { id: inv.id },
    data: { acceptedAt: new Date() },
  });

  await logAction({
    userId: user.id,
    organizationId: inv.organizationId,
    islem: "create",
    entity: "OrganizationMember",
    entityId: user.id,
    ozet: `Davet kabul edildi: ${user.adSoyad ?? inv.email} (${inv.role}) — ${inv.organization.ad}'a katıldı`,
  });

  return { ok: true, data: { email: inv.email } };
}
