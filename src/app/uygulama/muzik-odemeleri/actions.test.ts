import { beforeEach, describe, expect, it, vi } from "vitest";
import { MuzikMagaza } from "@/lib/enums";
import { createMuzikGelir, createSanatciOdemesi } from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    cari: { create: vi.fn(), findFirst: vi.fn() },
    hareket: { create: vi.fn() },
    kasaHareketi: { create: vi.fn() },
    muzikGelir: { create: vi.fn() },
    odemeNotu: { create: vi.fn() },
    sanatciOdemesi: { create: vi.fn() },
  };

  return {
    ctx: { userId: "user_1", orgId: "org_1" },
    db: {
      $transaction: vi.fn(),
      cari: { findFirst: vi.fn() },
      kasa: { findFirst: vi.fn() },
      muzikGelir: { create: vi.fn() },
      muzikProfil: { findFirst: vi.fn() },
      odemeNotu: { create: vi.fn() },
    },
    logAction: vi.fn(),
    revalidatePath: vi.fn(),
    tx,
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getOrgContext: vi.fn(async () => mocks.ctx),
  getOrgId: vi.fn(async () => mocks.ctx.orgId),
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/audit", () => ({
  logAction: mocks.logAction,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

function gelirFormData() {
  const fd = new FormData();
  fd.set("muzikProfilId", "10");
  fd.set("tarih", "2026-03-31");
  fd.set("platform", MuzikMagaza.Spotify);
  fd.set("tutar", "25.50");
  fd.set("paraBirimi", "USD");
  fd.set("not", "Spotify Mart payout");
  return fd;
}

function sanatciOdemesiFormData() {
  const fd = new FormData();
  fd.set("muzikProfilId", "10");
  fd.set("sanatciCariId", "7");
  fd.set("tarih", "2026-03-31");
  fd.set("tutar", "120");
  fd.set("paraBirimi", "USD");
  fd.set("kasaId", "3");
  fd.set("borclaraYansit", "true");
  fd.set("not", "Mart payout");
  return fd;
}

describe("muzik-odemeleri server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.muzikProfil.findFirst.mockResolvedValue({
      id: 10,
      isim: "Test Track",
      slug: "test-track",
    });
    mocks.tx.muzikGelir.create.mockResolvedValue({ id: 501 });
    mocks.db.cari.findFirst.mockResolvedValue({ id: 7, unvan: "Test Artist" });
    mocks.db.kasa.findFirst.mockResolvedValue({ id: 3 });
    mocks.tx.cari.findFirst.mockResolvedValue({ id: 77 });
    mocks.db.$transaction.mockImplementation(async (fn) => fn(mocks.tx));
    mocks.tx.hareket.create.mockResolvedValue({ id: 801 });
    mocks.tx.odemeNotu.create.mockResolvedValue({ id: 901 });
    mocks.tx.kasaHareketi.create.mockResolvedValue({ id: 1001 });
    mocks.tx.sanatciOdemesi.create.mockResolvedValue({ id: 601 });
  });

  it("creates a real MuzikGelir row through the server action schema", async () => {
    const result = await createMuzikGelir(gelirFormData());

    expect(result).toEqual({ ok: true });
    expect(mocks.tx.muzikGelir.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        muzikProfilId: 10,
        tarih: new Date("2026-03-31"),
        platform: MuzikMagaza.Spotify,
        tutar: 25.5,
        paraBirimi: "USD",
        not: "Spotify Mart payout",
        organizationId: "org_1",
        userId: "user_1",
      }),
      select: { id: true },
    });
  });

  it("mirrors detail-page music income into the global Gelirler ledger", async () => {
    await createMuzikGelir(gelirFormData());

    expect(mocks.tx.odemeNotu.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cariId: 77,
        yon: "Alacak",
        baslik: expect.stringContaining("Test Track"),
        tutar: 25.5,
        paraBirimi: "USD",
        detay: expect.objectContaining({
          isMuzikGeliri: true,
          muzikProfilId: 10,
          platform: MuzikMagaza.Spotify,
        }),
        organizationId: "org_1",
        userId: "user_1",
      }),
    });
  });

  it("records a kasa movement when an artist payout is paid from a selected kasa", async () => {
    const result = await createSanatciOdemesi(sanatciOdemesiFormData());

    expect(result).toEqual({ ok: true });
    expect(mocks.tx.kasaHareketi.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kasaId: 3,
        tip: "Cikis",
        tutar: 120,
        paraBirimi: "USD",
        organizationId: "org_1",
        userId: "user_1",
      }),
      select: { id: true },
    });
  });
});
