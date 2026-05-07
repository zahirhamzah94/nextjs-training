import { getAgencies, getAgenciesCached } from "@/lib/modules/agencies/service";

/**
 * Agencies "Controller" layer (HTTP adapter).
 *
 * Responsibilities:
 * - Read request-level input (query params, headers, etc.).
 * - Call the appropriate service function.
 * - Shape a consistent JSON response `{ data, meta }`.
 *
 * Flow:
 * - `GET /api/agencies?cached=1` → uses `getAgenciesCached()` (uses `use cache`).
 * - `GET /api/agencies`         → uses `getAgencies()` (always recomputed at request time).
 */
export async function getAgenciesController(request: Request) {
  const url = new URL(request.url);
  const cached = url.searchParams.get("cached") === "1";
  const result = cached ? await getAgenciesCached() : await getAgencies();
  return Response.json({ data: result.agencies, meta: { cached: result.cached, generatedAt: result.generatedAt } });
}

