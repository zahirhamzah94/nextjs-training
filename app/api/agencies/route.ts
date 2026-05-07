import { getAgenciesController } from "@/lib/modules/agencies/controller";

/**
 * Agencies Route Handler.
 *
 * This route intentionally delegates to a controller/service/repository stack to demonstrate a layered
 * architecture (instead of doing Prisma calls directly in the route file).
 *
 * Request:
 * - GET /api/agencies
 * - GET /api/agencies?cached=1 (returns cached result via `use cache`)
 *
 * Response:
 * - 200 JSON: `{ data: Agency[], meta: { cached: boolean, generatedAt: string } }`
 */
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
  return getAgenciesController(request);
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
