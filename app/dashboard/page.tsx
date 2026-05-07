import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getTrainersPage } from "@/lib/data";
import { getSession, hasAnyRole } from "@/lib/auth";

/**
 * Dashboard page (Trainer overview table).
 *
 * Data flow:
 * - Read `page` / `pageSize` from `searchParams`
 * - Call `getTrainersPage()` (data layer) which does Prisma `count()` + `findMany(skip/take)`
 * - Render a table and simple Previous/Next pagination links
 *
 * Cache Components / Suspense note:
 * - `connection()` is a request-time API. With Cache Components enabled, uncached runtime work must run
 *   inside a Suspense boundary to avoid "blocking-route" errors during prerendering.
 */
type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Formats a Date for table display (YYYY-MM-DD).
 */
function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

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
 * Helper for building pagination links that keep page/pageSize in the URL.
 */
function buildHref(pathname: string, page: number, pageSize: number) {
  return `${pathname}?page=${page}&pageSize=${pageSize}`;
}

/**
 * Wrapper component that provides a Suspense boundary for the async content component.
 */
export default function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <DashboardPageContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component that performs the runtime/DB work.
 */
async function DashboardPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const { user, roles } = await getSession();

  const sp: SearchParams = searchParams ? await searchParams : {};
  const requestedPage = parseBoundedInt(firstParam(sp.page), 1, 1, 1_000_000);
  const pageSize = parseBoundedInt(firstParam(sp.pageSize), 10, 1, 50);

  const { data: trainers, meta } = await getTrainersPage({ page: requestedPage, pageSize });
  const { page, total, totalPages } = meta;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-black/70 dark:text-white/70">
          {user?.name ?? user?.preferred_username ?? user?.email ?? "Signed in"} · {roles.length ? roles.join(", ") : "No roles"}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {hasAnyRole(roles, ["admin", "editor"]) ? (
          <Link
            href="/dashboard/posts"
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="text-sm text-black/60 dark:text-white/60">Manage</div>
            <div className="text-lg font-semibold">Posts</div>
            <div className="text-sm text-black/70 dark:text-white/70">Create and review posts</div>
          </Link>
        ) : null}

        {hasAnyRole(roles, ["admin"]) ? (
          <Link
            href="/users"
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="text-sm text-black/60 dark:text-white/60">Admin</div>
            <div className="text-lg font-semibold">Users</div>
            <div className="text-sm text-black/70 dark:text-white/70">Manage accounts and roles</div>
          </Link>
        ) : null}

        {hasAnyRole(roles, ["admin", "auditor"]) ? (
          <Link
            href="/audit-logs"
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="text-sm text-black/60 dark:text-white/60">Review</div>
            <div className="text-lg font-semibold">Audit logs</div>
            <div className="text-sm text-black/70 dark:text-white/70">Track system activity</div>
          </Link>
        ) : null}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={6}>
                    No trainers found.
                  </td>
                </tr>
              ) : (
                trainers.map((trainer) => (
                  <tr
                    key={trainer.id}
                    className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-4 py-3 font-medium">{trainer.name ?? "—"}</td>
                    <td className="px-4 py-3">{trainer.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium">
                        {trainer.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(trainer.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(trainer.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/users/${trainer.id}/edit`} className="text-blue-600 hover:underline">
                        Edit
                      </Link>
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
          Page {page} of {totalPages} · {total} total
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildHref("/dashboard", page - 1, pageSize)}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Previous
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={buildHref("/dashboard", page + 1, pageSize)}
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

