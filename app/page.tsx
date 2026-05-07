import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function HomePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <HomePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomePageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const { authenticated, user, roles } = await getSession();
  const sp: SearchParams = searchParams ? await searchParams : {};
  const error = firstParam(sp.error);

  return (
    <div className="space-y-10">
      {error === "forbidden" ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          Your account is signed in but does not have access to that page.
        </div>
      ) : null}

      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Trainer Portal</h1>
        <p className="text-black/70 dark:text-white/70 max-w-2xl">
          Single Sign-On with Keycloak + role-based access control, with an authenticated dashboard experience.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {authenticated ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              href="/api/auth/login?next=%2Fdashboard"
              className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
            >
              Login with Keycloak
            </Link>
          )}
          <Link
            href="/advanced"
            className="px-4 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
          >
            View demos
          </Link>
        </div>
      </section>

      {authenticated ? (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-2">
          <div className="text-sm text-black/60 dark:text-white/60">Signed in</div>
          <div className="text-lg font-semibold">{user?.name ?? user?.preferred_username ?? user?.email ?? "Account"}</div>
          <div className="text-sm text-black/70 dark:text-white/70">{roles.length ? roles.join(", ") : "No roles"}</div>
        </section>
      ) : (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 space-y-2">
          <div className="text-sm text-black/60 dark:text-white/60">Get started</div>
          <div className="text-black/70 dark:text-white/70">
            Sign in with Keycloak to access the dashboard and role-based navigation.
          </div>
          <div className="text-sm text-black/60 dark:text-white/60">
            Configure KEYCLOAK_ISSUER and KEYCLOAK_CLIENT_ID in your environment.
          </div>
        </section>
      )}
    </div>
  );
}
