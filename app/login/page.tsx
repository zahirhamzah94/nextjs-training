import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";
import LoginErrorPopup from "@/components/LoginErrorPopup";

/**
 * Login page (demo).
 *
 * Flow:
 * - Reads optional `next` from the URL query string (e.g. `/login?next=/protected`).
 * - Submits a POST form to `/api/auth/login`.
 * - The route handler sets cookies (`tp_session`, optional `tp_actorUserId`) and redirects to `next`.
 *
 * Cache Components / Suspense note:
 * - `searchParams` is request-specific input; wrap the async content in Suspense.
 */
type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Normalizes a query param that could be `string | string[] | undefined` into a single string.
 */
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function LoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component that derives the redirect target and renders the form.
 */
async function LoginPageContent({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();
  const sp: SearchParams = searchParams ? await searchParams : {};
  const next = firstParam(sp.next) ?? "/protected";
  const error = firstParam(sp.error);
  const keycloakConfigured = Boolean(
    process.env["KEYCLOAK_CLIENT_ID"] &&
      (process.env["KEYCLOAK_ISSUER"] || (process.env["NEXT_PUBLIC_KEYCLOAK_BASE_URL"] && process.env["NEXT_PUBLIC_KEYCLOAK_REALM"])),
  );
  const { authenticated } = await getSession();

  if (authenticated && error !== "forbidden") {
    redirect(next);
  }

  if (keycloakConfigured && !error) {
    redirect(`/api/auth/login?next=${encodeURIComponent(next)}`);
  }

  const errorMessage =
    error === "forbidden"
      ? "Your account does not have access to the requested page."
      : error === "MYDIGITALID_PROFILE_INVALID"
        ? "Sign-in failed: NRIC claim missing from the identity provider profile."
        : error === "MYDIGITALID_USER_NOT_REGISTERED"
          ? "Your NRIC is not registered in this application."
          : error
            ? `Sign-in error: ${error}`
            : null;

  return (
    <div className="space-y-6 max-w-xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-black/70 dark:text-white/70">
          Sign in with your Keycloak account.
        </p>
      </header>

      {errorMessage ? <LoginErrorPopup message={errorMessage} /> : null}

      {keycloakConfigured ? (
        <Link
          href={`/api/auth/login?next=${encodeURIComponent(next)}`}
          className="inline-flex px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          Continue with Keycloak
        </Link>
      ) : (
        <div className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-sm text-black/70 dark:text-white/70">
          Keycloak is not configured. Set KEYCLOAK_ISSUER and KEYCLOAK_CLIENT_ID.
        </div>
      )}

      <div className="text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
