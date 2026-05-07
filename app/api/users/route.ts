import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Users collection Route Handler.
 *
 * GET:
 * - Pagination via `page` and `pageSize`.
 * - Returns joined profile bio (if present) to show richer user data.
 *
 * POST:
 * - Accepts JSON body validated with Zod.
 * - Creates user (+ optional profile) and an audit log row in a single transaction.
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

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["USER", "TRAINER", "ADMIN"]).optional(),
  bio: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseBoundedInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 10, 1, 50);
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true } },
        },
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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid user data" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          role: parsed.data.role ?? "USER",
          profile: parsed.data.bio ? { create: { bio: parsed.data.bio } } : undefined,
        },
        select: { id: true, email: true, role: true },
      });

      await tx.auditLog.create({
        data: { action: "CREATE", entityType: "USER", entityId: user.id, metadata: { email: user.email, role: user.role } },
      });

      return { id: user.id };
    });

    return Response.json({ data: created }, { status: 201 });
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
    { status: 405, headers: { Allow: "GET, POST" } },
  );
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
