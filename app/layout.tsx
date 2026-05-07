import { Suspense } from "react";
import { connection } from "next/server";

import AppTopbar from "@/components/AppTopbar";
import { getSession } from "@/lib/auth";
import "./globals.css";

/**
 * Root layout for the App Router.
 *
 * Responsibilities:
 * - Apply global styles (`globals.css`).
 * - Render the top navigation used to access the demo pages.
 * - Render the active route via `children`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans bg-white dark:bg-black text-black dark:text-white">
        <Suspense fallback={<div className="h-14 border-b border-black/10 dark:border-white/10" />}>
          <Topbar />
        </Suspense>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

async function Topbar() {
  await connection();
  const { authenticated, user, roles } = await getSession();
  return <AppTopbar authenticated={authenticated} user={user} roles={roles} />;
}
