import { prisma } from "@/lib/db";

/**
 * Trainers listing endpoint (read-only).
 *
 * This is effectively a filtered Users list:
 * - `where: { role: "TRAINER" }`
 *
 * Query params:
 * - `page`, `pageSize` for pagination
 *
 * Response:
 * - `{ data, meta }` for table rendering.
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseBoundedInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 10, 1, 50);
    const skip = (page - 1) * pageSize;

    const where = { role: "TRAINER" as const };

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return Response.json({
      data,
      meta: { page: Math.min(page, totalPages), pageSize, total, totalPages },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
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
