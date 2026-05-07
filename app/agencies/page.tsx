import Link from "next/link";
import { Suspense } from "react";

import { getAgencies, getAgenciesCached } from "@/lib/modules/agencies/service";

/**
 * Agencies page (Architecture + caching demo).
 *
 * Data flow:
 * - Read `cached` from `searchParams` (`?cached=1` or `?cached=0`).
 * - Call either `getAgenciesCached()` (uses `use cache`) or `getAgencies()` (always recomputed).
 * - Render a simple table + a timestamp so caching behavior is visible.
 *
 * Notes:
 * - This page calls the Service layer directly (UI path).
 * - The API route `/api/agencies` calls the Controller layer (HTTP path).
 * - `searchParams` is request-specific input, so the async work is wrapped in Suspense.
 */
type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Normalizes a query param that could be `string | string[] | undefined` into a single string.
 */
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AgenciesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <AgenciesPageContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component that chooses cached vs uncached service calls.
 */
async function AgenciesPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp: SearchParams = searchParams ? await searchParams : {};
  const cached = firstParam(sp.cached) === "1";

  const result = cached ? await getAgenciesCached() : await getAgencies();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Agencies (Architecture + Caching Demo)</h1>
        <p className="text-black/70 dark:text-white/70">
          This page uses Controller → Service → Repository layers and demonstrates caching.
        </p>
      </header>

      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/agencies?cached=1"
          className={[
            "px-3 py-1.5 rounded border border-black/10 dark:border-white/10",
            cached ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10",
          ].join(" ")}
        >
          Cached
        </Link>
        <Link
          href="/agencies?cached=0"
          className={[
            "px-3 py-1.5 rounded border border-black/10 dark:border-white/10",
            !cached ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10",
          ].join(" ")}
        >
          Uncached
        </Link>
        <Link href="/api/agencies?cached=1" className="text-blue-600 hover:underline">
          API (cached)
        </Link>
        <Link href="/api/agencies?cached=0" className="text-blue-600 hover:underline">
          API (uncached)
        </Link>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2">
        <div className="text-sm text-black/70 dark:text-white/70">
          Mode: {result.cached ? "cached" : "uncached"} · generatedAt:{" "}
          <span className="font-mono">{result.generatedAt}</span>
        </div>
        <div className="text-sm text-black/70 dark:text-white/70">
          Service example:
          <pre className="mt-2 rounded border border-black/10 dark:border-white/10 p-3 overflow-x-auto text-xs">
            {"export const getAgencies = () => prisma.agency.findMany();"}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Posts</th>
              </tr>
            </thead>
            <tbody>
              {result.agencies.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={2}>
                    No agencies found.
                  </td>
                </tr>
              ) : (
                result.agencies.map((agency) => (
                  <tr
                    key={agency.id}
                    className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-4 py-3 font-medium">{agency.name}</td>
                    <td className="px-4 py-3 tabular-nums">{agency._count.posts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

