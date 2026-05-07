import { getAuditLogsPage } from "@/lib/data";

/**
 * Audit logs listing endpoint (read-only).
 *
 * Query params:
 * - `page`, `pageSize`: pagination
 * - `entityType`: USER | POST | CATEGORY (optional)
 * - `action`: CREATE | UPDATE | DELETE (optional)
 * - `entityId`: number (optional)
 *
 * Flow:
 * - Parse and validate query params.
 * - Delegate to `getAuditLogsPage()` (data layer) for `count()` + `findMany()` + meta.
 * - Return `{ data, meta }` for easy table rendering.
 */
type AuditEntityType = "USER" | "POST" | "CATEGORY";
type AuditAction = "CREATE" | "UPDATE" | "DELETE";

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
    const page = parseBoundedInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 20, 1, 100);
    const entityType = url.searchParams.get("entityType");
    const action = url.searchParams.get("action");
    const entityIdRaw = url.searchParams.get("entityId");
    const entityId = entityIdRaw ? Number.parseInt(entityIdRaw, 10) : undefined;

    const filters: { entityType?: AuditEntityType; action?: AuditAction; entityId?: number } = {
      entityType: entityType === "USER" || entityType === "POST" || entityType === "CATEGORY" ? entityType : undefined,
      action: action === "CREATE" || action === "UPDATE" || action === "DELETE" ? action : undefined,
      entityId: Number.isFinite(entityId) ? entityId : undefined,
    };

    const { data, meta } = await getAuditLogsPage({ page, pageSize, ...filters });
    return Response.json({ data, meta });
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
