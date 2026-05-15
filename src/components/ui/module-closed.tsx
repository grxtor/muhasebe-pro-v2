import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

interface Props {
  modulAd: string;
  aciklama?: string;
}

/**
 * Bir modül kapalıyken URL'den gelinirse gösterilen sayfa.
 * Sidebar'da görünmüyor ama URL'i bilenler için bilgilendirici.
 */
export function ModuleClosed({ modulAd, aciklama }: Props) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div
        className="mx-auto mb-4 grid size-14 place-items-center rounded-full"
        style={{
          background: "var(--surface-muted)",
          color: "var(--text-muted)",
        }}
      >
        <Lock size={22} />
      </div>
      <h1 className="text-xl font-semibold">{modulAd} modülü kapalı</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        {aciklama ??
          `Bu modülü hesabınızdan gizlediniz. Yeniden açmak için Ayarlar > Modüller'e gidin.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          href="/uygulama/ayarlar/moduller"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: "var(--accent)",
            color: "var(--accent-foreground)",
          }}
        >
          Modüller Ayarına Git <ArrowRight size={14} />
        </Link>
        <Link
          href="/uygulama"
          className="rounded-lg px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: "var(--text-muted)" }}
        >
          Anasayfa'ya Dön
        </Link>
      </div>
    </div>
  );
}
