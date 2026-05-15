"use server";

import { headers } from "next/headers";
import { db } from "./db";

interface LogActionParams {
  userId: string;
  islem: string; // "create" | "update" | "delete" | "tahsil" | "ode" | "login" | "logout"
  entity: string; // "Cari" | "Fatura" | "OdemeNotu" | "Hareket" | "Urun" | "Hatirlatici" | "TekrarlayanKayit" | "Auth" | "Settings"
  entityId?: string | number;
  ozet: string;
  oncesi?: unknown;
  sonrasi?: unknown;
}

/**
 * Audit log kaydı oluştur. Fail-safe: hata yutulur, esas akışı kesmez.
 */
export async function logAction(params: LogActionParams) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent") ?? null;

    await db.auditLog.create({
      data: {
        userId: params.userId,
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
    // Audit kaydı asla esas akışı engellemez
    console.error("[audit] logAction failed:", err);
  }
}
