import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth-helpers";
import { History, FileEdit, FilePlus, FileX, LogIn } from "lucide-react";
import { SectionCard } from "../profil-form";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTarihSaat } from "@/lib/format";

export const metadata = { title: "Aktivite Geçmişi" };
export const dynamic = "force-dynamic";

export default async function AktivitePage() {
  const orgId = await getOrgId();
  const logs = await db.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { adSoyad: true, email: true } } },
  });

  return (
    <SectionCard
      title="Aktivite Geçmişi"
      description="Son 200 işlem — şirketinizde yapılan tüm değişiklikler (kim, ne zaman, ne)"
    >
      {logs.length === 0 ? (
        <EmptyState
          compact
          icon={<History size={22} />}
          title="Henüz aktivite yok"
          description="Bir işlem yapıldığında burada görünecek"
        />
      ) : (
        <ul className="space-y-1">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div
                className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                style={{ background: iconBg(log.islem), color: iconColor(log.islem) }}
              >
                <IslemIcon islem={log.islem} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{log.ozet}</div>
                <div
                  className="mt-0.5 flex flex-wrap items-center gap-2 text-xs"
                  style={{ color: "var(--text-soft)" }}
                >
                  <span>{formatTarihSaat(log.createdAt)}</span>
                  <span>·</span>
                  <span>{log.user?.adSoyad ?? log.user?.email ?? "Sistem"}</span>
                  <span>·</span>
                  <span className="font-mono">{log.entity}</span>
                  {log.ip && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{log.ip}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function IslemIcon({ islem }: { islem: string }) {
  switch (islem) {
    case "create":
      return <FilePlus size={14} />;
    case "update":
      return <FileEdit size={14} />;
    case "delete":
      return <FileX size={14} />;
    case "login":
    case "logout":
      return <LogIn size={14} />;
    default:
      return <History size={14} />;
  }
}

function iconBg(islem: string): string {
  if (islem === "create") return "var(--positive-soft)";
  if (islem === "delete") return "var(--negative-soft)";
  return "var(--surface-muted)";
}

function iconColor(islem: string): string {
  if (islem === "create") return "var(--positive)";
  if (islem === "delete") return "var(--negative)";
  return "var(--text-muted)";
}
