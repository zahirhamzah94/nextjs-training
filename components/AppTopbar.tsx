"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionUser = {
  email?: string;
  preferred_username?: string;
  name?: string;
};

export default function AppTopbar(props: {
  authenticated: boolean;
  user?: SessionUser;
  roles: string[];
}) {
  const { authenticated, user, roles } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayName = user?.name ?? user?.preferred_username ?? user?.email ?? "Account";

  const notifications = useMemo(
    () => [
      { id: "welcome", title: "Welcome", body: authenticated ? "You’re signed in." : "Sign in to access the dashboard." },
      { id: "rbac", title: "Access", body: roles.length ? `Roles: ${roles.join(", ")}` : "No roles found on your session." },
    ],
    [authenticated, roles],
  );

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            Trainer Portal
          </Link>
          {authenticated ? (
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/dashboard" className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white">
                Dashboard
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              Notifications
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
                  {authenticated ? displayName : "Guest"}
                </div>
                <ul className="max-h-80 overflow-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-3 py-2 border-b border-black/10 dark:border-white/10 last:border-b-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-sm text-black/70 dark:text-white/70">{n.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {authenticated ? (
            <>
              <div className="hidden sm:block text-sm text-black/70 dark:text-white/70">{displayName}</div>
              <form method="post" action="/api/auth/logout?provider=keycloak">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black text-sm"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/api/auth/login?next=%2Fdashboard"
              className="px-3 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black text-sm"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
