import { Suspense } from "react";
import { connection } from "next/server";

import DashboardSidebar from "@/components/DashboardSidebar";
import { getSession } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

async function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const { roles } = await getSession();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
      <DashboardSidebar roles={roles} />
      <div className="flex-1 p-6 bg-black/[0.02] dark:bg-white/[0.03]">{children}</div>
    </div>
  );
}
