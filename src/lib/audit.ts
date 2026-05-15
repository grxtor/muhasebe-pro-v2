"use server";

import { headers } from "next/headers";
import { db } from "./db";

interface LogActionParams {
  userId: string;
  organizationId?: string | null;
  islem: string;
  entity: string;
  entityId?: string | number;
  ozet: string;
  oncesi?: unknown;
  sonrasi?: unknown;
}

/**
 * Audit log kaydı oluştur. Fail-safe.
 * organizationId verilmezse kullanıcının currentOrgId'sinden çekilir.
 */
export async function logAction(params: LogActionParams) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent") ?? null;

    let orgId = params.organizationId ?? null;
    if (!orgId) {
      const u = await db.user.findUnique({
        where: { id: params.userId },
        select: { currentOrgId: true },
      });
      orgId = u?.currentOrgId ?? null;
    }

    await db.auditLog.create({
      data: {
        userId: params.userId,
        organizationId: orgId,
        islem: params.islem,
        entity: params.entity,
        entityId: params.entityId != null ? String(params.entityId) : null,
        ozet: params.ozet,
        oncesi:
          params.oncesi !== undefined
            ? (JSON.parse(JSON.stringify(params.oncesi)) as object)
            : undefined,
        sonrasi:
          params.sonrasi !== undefined
            ? (JSON.parse(JSON.stringify(params.sonrasi)) as object)
            : undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] logAction failed:", err);
  }
}
