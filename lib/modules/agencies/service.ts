import { findAgencies } from "@/lib/modules/agencies/repository";

/**
 * Agencies "Service" layer.
 *
 * Responsibilities:
 * - Orchestrate repository calls.
 * - Decide whether the result should be cached.
 * - Provide small pieces of computed metadata for callers (e.g., `generatedAt`, `cached`).
 *
 * Cache Components note:
 * - `use cache` can only appear in a function body, not directly in a Route Handler body.
 * - The controller picks between cached vs uncached based on the request URL.
 */
export async function getAgencies() {
  const agencies = await findAgencies();
  return { agencies, generatedAt: new Date().toISOString(), cached: false as const };
}

/**
 * Cached variant of `getAgencies()`.
 * - When Cache Components is enabled, this can be included in prerendered responses.
 * - `generatedAt` helps you visually confirm whether the response is cached or recomputed.
 */
export async function getAgenciesCached() {
  "use cache";
  const agencies = await findAgencies();
  return { agencies, generatedAt: new Date().toISOString(), cached: true as const };
}
