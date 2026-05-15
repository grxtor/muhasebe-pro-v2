import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth-helpers";
import { History, FileEdit, FilePlus, FileX, LogIn } from "lucide-react";
import { SectionCard } from "../profil-form";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTarihSaat } from "@/lib/format";

export const metadata = { title: "Aktivite Geçmişi" };
export const dynamic = "force-dynamic";

export default async function AktivitePage() {
  const userId = await getUserId();
  const logs = await db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <SectionCard
      title="Aktivite Geçmişi"
      description="Son 200 işlem — hesabınızda yapılan tüm değişiklikler"
    >
      {logs.length === 0 ? (
        <EmptyState
          compact
          icon={<History size={22} />}
          title="Henüz aktivite yok"
          description="Bir işlem yaptığınızda burada görünecek"
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
                style={{
                  background: iconBg(log.islem),
                  color: iconColor(log.islem),
                }}
              >
                <IslemIcon islem={log.islem} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{log.ozet}</div>
                <div
                  className="mt-0.5 flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-soft)" }}
                >
                  <span>{formatTarihSaat(log.createdAt)}</span>
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
  switch (islem) {
    case "create":
      return "var(--positive-soft)";
    case "delete":
      return "var(--negative-soft)";
    case "update":
      return "var(--surface-muted)";
    default:
      return "var(--surface-muted)";
  }
}

function iconColor(islem: string): string {
  switch (islem) {
    case "create":
      return "var(--positive)";
    case "delete":
      return "var(--negative)";
    case "update":
      return "var(--text-muted)";
    default:
      return "var(--text-muted)";
  }
}
