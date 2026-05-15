import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            ₺
          </span>
          Muhasebe Pro
        </Link>
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
