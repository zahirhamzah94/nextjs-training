import { prisma } from "@/lib/db";

/**
 * Audit log export endpoint (CSV download).
 *
 * Query params:
 * - `limit` (default 1000, max 10000): caps the number of exported rows.
 *
 * Response:
 * - 200 text/csv with `Content-Disposition: attachment` to trigger a file download in browsers.
 *
 * Flow:
 * - Read the latest audit logs (ordered desc).
 * - Convert to CSV with proper escaping for commas/quotes/newlines.
 *
 * Notes:
 * - This intentionally uses manual CSV formatting to avoid adding a dependency.
 */
/**
 * Parses an integer query param and clamps it to a safe range.
 */
function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Escapes a single CSV cell value according to basic RFC 4180 rules:
 * - Wrap in quotes if it contains quotes, commas, or newlines
 * - Escape inner quotes by doubling them
 */
function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Consistent 405 helper for unsupported methods.
 */
function methodNotAllowed(method: string) {
  return Response.json(
    { error: `Method ${method} not allowed` },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseBoundedInt(url.searchParams.get("limit"), 1000, 1, 10000);

    const logs = await prisma.auditLog.findMany({
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const header = ["id", "createdAt", "action", "entityType", "entityId", "actorUserId", "metadata"].join(",");
    const lines = logs.map((log) => {
      const row = [
        String(log.id),
        log.createdAt.toISOString(),
        String(log.action),
        String(log.entityType),
        String(log.entityId),
        log.actorUserId == null ? "" : String(log.actorUserId),
        log.metadata == null ? "" : JSON.stringify(log.metadata),
      ].map(csvEscape);
      return row.join(",");
    });

    const csv = [header, ...lines].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-logs.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return methodNotAllowed("POST");
}

export async function PUT() {
  return methodNotAllowed("PUT");
}

export async function PATCH() {
  return methodNotAllowed("PATCH");
}

export async function DELETE() {
  return methodNotAllowed("DELETE");
}
