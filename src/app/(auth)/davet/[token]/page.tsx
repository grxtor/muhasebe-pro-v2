import Link from "next/link";
import { db } from "@/lib/db";
import { DavetForm } from "./davet-form";

export const metadata = { title: "Davet" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function DavetPage({ params }: PageProps) {
  const { token } = await params;

  const inv = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { ad: true } },
    },
  });

  if (!inv) {
    return <DavetError title="Davet bulunamadı" description="Bu davet linki geçersiz." />;
  }
  if (inv.acceptedAt) {
    return (
      <DavetError
        title="Davet zaten kabul edilmiş"
        description="Bu davet daha önce kullanılmış. Giriş yaparak hesabınıza ulaşabilirsiniz."
        showLogin
      />
    );
  }
  if (inv.expiresAt < new Date()) {
    return (
      <DavetError
        title="Davetin süresi dolmuş"
        description="Davet linki 7 gün boyunca geçerlidir. Şirket yöneticinizden yeni davet isteyin."
      />
    );
  }

  // Kullanıcı zaten var mı?
  const mevcutKullanici = await db.user.findUnique({
    where: { email: inv.email },
    select: { adSoyad: true },
  });

  return (
    <DavetForm
      token={token}
      email={inv.email}
      role={inv.role}
      orgAd={inv.organization.ad}
      mevcutKullanici={
        mevcutKullanici
          ? { adSoyad: mevcutKullanici.adSoyad ?? "" }
          : null
      }
    />
  );
}

function DavetError({
  title,
  description,
  showLogin = false,
}: {
  title: string;
  description: string;
  showLogin?: boolean;
}) {
  return (
    <div className="space-y-6 text-center">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </header>
      <Link
        href={showLogin ? "/giris" : "/"}
        className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium"
        style={{
          borderColor: "var(--border-strong)",
          color: "var(--text)",
        }}
      >
        {showLogin ? "Giriş Yap" : "Anasayfa"}
      </Link>
    </div>
  );
}
