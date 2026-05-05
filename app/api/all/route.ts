import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseBoundedInt(url.searchParams.get("limit"), 100, 1, 1000);

    const [users, categories, posts] = await Promise.all([
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
        take: limit,
      }),
      prisma.category.findMany({
        select: { id: true, name: true, _count: { select: { posts: true } } },
        orderBy: { name: "asc" },
        take: limit,
      }),
      prisma.post.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
    ]);

    return Response.json({ users, categories, posts, meta: { limit } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

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
