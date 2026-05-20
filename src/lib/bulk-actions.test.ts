import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkDeleteOdemeNotlari } from "./bulk-actions";

const mocks = vi.hoisted(() => ({
  ctx: { userId: "user_1", orgId: "org_1" },
  db: {
    $transaction: vi.fn(),
    muzikGelir: { deleteMany: vi.fn() },
    muzikHarcama: { deleteMany: vi.fn() },
    odemeNotu: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
  logAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("./auth-helpers", () => ({
  getOrgContext: vi.fn(async () => mocks.ctx),
}));

vi.mock("./db", () => ({
  db: mocks.db,
}));

vi.mock("./audit", () => ({
  logAction: mocks.logAction,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

describe("bulkDeleteOdemeNotlari", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.odemeNotu.findMany.mockResolvedValue([
      { id: 1, detay: { isMuzikGeliri: true, muzikGelirId: 501 } },
      { id: 2, detay: { isMuzikGeliri: true, muzikGelirId: 502 } },
    ]);
    mocks.db.muzikGelir.deleteMany.mockResolvedValue({ count: 2 });
    mocks.db.muzikHarcama.deleteMany.mockResolvedValue({ count: 0 });
    mocks.db.odemeNotu.deleteMany.mockResolvedValue({ count: 2 });
    mocks.db.$transaction.mockImplementation(async (fn) => fn(mocks.db));
  });

  it("cleans linked MuzikGelir rows before bulk deleting payment notes", async () => {
    const result = await bulkDeleteOdemeNotlari([1, 2]);

    expect(result).toEqual({ ok: true, count: 2 });
    expect(mocks.db.odemeNotu.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, organizationId: "org_1" },
      select: { id: true, detay: true },
    });
    expect(mocks.db.muzikGelir.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [501, 502] },
        organizationId: "org_1",
      },
    });
    expect(mocks.db.odemeNotu.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, organizationId: "org_1" },
    });
  });
});
