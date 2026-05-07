import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getAuditLogsPage } from "@/lib/data";

/**
 * Audit Logs page (table + filters + export).
 *
 * Data flow:
 * - Parse pagination and filter params from `searchParams`.
 * - Delegate DB reads to `getAuditLogsPage()` (data layer) for count + findMany.
 * - Render a filter form (GET) that updates the URL query string.
 *
 * Related API:
 * - CSV export link points to `/api/audit-logs/export`.
 *
 * Cache Components / Suspense note:
 * - `connection()` is request-time; async work is wrapped in Suspense.
 */
type SearchParams = { [key: string]: string | string[] | undefined };
type AuditEntityType = "USER" | "POST" | "CATEGORY";
type AuditAction = "CREATE" | "UPDATE" | "DELETE";

/**
 * Normalizes a query param that could be `string | string[] | undefined` into a single string.
 */
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses an integer query param and clamps it to a safe range.
 */
function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Builds a link to the same page with a specific set of query params.
 * Used for pagination links that preserve active filters.
 */
function buildHref(pathname: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`http://local${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return `${pathname}?${url.searchParams.toString()}`;
}

/**
 * Formats a DateTime for table display (YYYY-MM-DD HH:mm:ss).
 */
function formatDateTime(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 19);
}

export default function AuditLogsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <AuditLogsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component that performs DB reads and renders the table + filters.
 */
async function AuditLogsPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();

  const sp: SearchParams = searchParams ? await searchParams : {};
  const requestedPage = parseBoundedInt(firstParam(sp.page), 1, 1, 1_000_000);
  const pageSize = parseBoundedInt(firstParam(sp.pageSize), 20, 1, 100);
  const entityType = firstParam(sp.entityType);
  const action = firstParam(sp.action);
  const entityIdRaw = firstParam(sp.entityId);
  const entityId = entityIdRaw ? Number.parseInt(entityIdRaw, 10) : undefined;

  const filters: { entityType?: AuditEntityType; action?: AuditAction; entityId?: number } = {
    entityType: entityType === "USER" || entityType === "POST" || entityType === "CATEGORY" ? entityType : undefined,
    action: action === "CREATE" || action === "UPDATE" || action === "DELETE" ? action : undefined,
    entityId: Number.isFinite(entityId) ? entityId : undefined,
  };

  const { data: logs, meta } = await getAuditLogsPage({
    page: requestedPage,
    pageSize,
    ...filters,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-black/70 dark:text-white/70">System activity across users, posts, and categories</p>
        </div>
        <Link
          href="/api/audit-logs/export"
          className="px-4 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Export CSV
        </Link>
      </header>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <div className="space-y-1">
            <label className="font-medium" htmlFor="entityType">
              Entity
            </label>
            <select
              id="entityType"
              name="entityType"
              defaultValue={filters.entityType ?? ""}
              className="rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            >
              <option value="">All</option>
              <option value="USER">USER</option>
              <option value="POST">POST</option>
              <option value="CATEGORY">CATEGORY</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium" htmlFor="action">
              Action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={filters.action ?? ""}
              className="rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            >
              <option value="">All</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium" htmlFor="entityId">
              Entity ID
            </label>
            <input
              id="entityId"
              name="entityId"
              defaultValue={filters.entityId?.toString() ?? ""}
              className="w-36 rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium" htmlFor="pageSize">
              Page Size
            </label>
            <select
              id="pageSize"
              name="pageSize"
              defaultValue={pageSize}
              className="rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
          >
            Apply
          </button>

          <Link href="/audit-logs" className="px-4 py-2 rounded border border-black/10 dark:border-white/10">
            Reset
          </Link>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Entity ID</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={6}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-4 py-3 tabular-nums">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.entityType}</td>
                    <td className="px-4 py-3 tabular-nums">{log.entityId}</td>
                    <td className="px-4 py-3 tabular-nums">{log.actorUserId ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 140) : "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="text-black/70 dark:text-white/70">
          Page {meta.page} of {meta.totalPages} · {meta.total} total
        </div>
        <div className="flex items-center gap-2">
          {meta.page > 1 ? (
            <Link
              href={buildHref("/audit-logs", {
                ...filters,
                page: meta.page - 1,
                pageSize: meta.pageSize,
              })}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Previous
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Previous
            </span>
          )}
          {meta.page < meta.totalPages ? (
            <Link
              href={buildHref("/audit-logs", {
                ...filters,
                page: meta.page + 1,
                pageSize: meta.pageSize,
              })}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Next
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
