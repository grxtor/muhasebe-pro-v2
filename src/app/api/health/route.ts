/**
 * Healthcheck endpoint — Dokploy + Docker healthcheck için.
 * DB bağlantısını kontrol etmez (cold-start sırasında healthy görünsün diye).
 */
export async function GET() {
  return Response.json(
    {
      status: "ok",
      ts: new Date().toISOString(),
      service: "muhasebe-pro-v2",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
