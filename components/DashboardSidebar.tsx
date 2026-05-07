import Link from "next/link";

function hasAnyRole(userRoles: string[], requiredAnyOf: string[]) {
  if (requiredAnyOf.length === 0) return true;
  const set = new Set(userRoles);
  return requiredAnyOf.some((r) => set.has(r));
}

export default function DashboardSidebar(props: { roles: string[] }) {
  const { roles } = props;

  const items: Array<{ href: string; label: string; roles?: string[] }> = [
    { href: "/dashboard", label: "Overview", roles: ["admin", "trainer", "editor", "auditor"] },
    { href: "/dashboard/posts", label: "Posts", roles: ["admin", "editor"] },
    { href: "/posts", label: "All Posts", roles: ["admin", "editor"] },
    { href: "/categories", label: "Categories", roles: ["admin", "editor"] },
    { href: "/users", label: "Users", roles: ["admin"] },
    { href: "/audit-logs", label: "Audit Logs", roles: ["admin", "auditor"] },
  ];

  const visible = items.filter((i) => hasAnyRole(roles, i.roles ?? []));

  return (
    <aside className="w-64 shrink-0 border-r border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <div className="p-4">
        <div className="text-xs text-black/60 dark:text-white/60">Menu</div>
        <nav className="mt-3 flex flex-col gap-1">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

