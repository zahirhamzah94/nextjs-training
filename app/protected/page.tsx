import Link from "next/link";

/**
 * Protected page (middleware demo).
 *
 * Flow:
 * - Requests to `/protected/*` run through `middleware.ts`.
 * - If `tp_session` cookie is missing, middleware redirects to `/login?next=/protected`.
 * - If session exists, this page renders normally.
 *
 * Logout:
 * - Form posts to `/api/auth/logout`, which clears cookies and redirects to `/`.
 */
export default async function ProtectedPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Protected Page</h1>
        <p className="text-black/70 dark:text-white/70">
          Middleware blocks this route unless the demo session cookie is present.
        </p>
      </header>

      <div className="flex items-center gap-3 text-sm">
        <Link href="/advanced" className="text-blue-600 hover:underline">
          Advanced demo overview
        </Link>
        <Link href="/agencies?cached=1" className="text-blue-600 hover:underline">
          Agencies caching demo
        </Link>
        <Link href="/audit-logs" className="text-blue-600 hover:underline">
          Audit logs
        </Link>
      </div>

      <form method="post" action="/api/auth/logout">
        <button type="submit" className="px-4 py-2 rounded border border-black/10 dark:border-white/10">
          Logout
        </button>
      </form>
    </div>
  );
}
