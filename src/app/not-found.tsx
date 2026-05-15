import Link from "next/link";

export const metadata = {
  title: "Sayfa Bulunamadı",
};

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <div
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--brand)" }}
        >
          404
        </div>
        <h1 className="mt-2 text-3xl font-bold">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Aradığınız sayfa kaldırılmış veya hiç var olmamış olabilir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--brand)" }}
        >
          Anasayfa'ya dön
        </Link>
      </div>
    </div>
  );
}
