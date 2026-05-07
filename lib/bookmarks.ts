/**
 * Learning bookmarks registry for the training plan.
 *
 * Purpose:
 * - Provide a single, typed source of truth for "what to teach and where to look in code".
 * - Rendered by the `/bookmarks` page.
 */
export type LearningDay =
  | "DAY 1: Foundations & Setup"
  | "DAY 2: Backend + Prisma Deep Dive"
  | "DAY 3: Advanced Features & Architecture"
  | "DAY 4: Authentication & SSO (MyIdentity)"
  | "DAY 5: Integration, Deployment & Teaching Practice";

export type BookmarkKind = "page" | "api" | "middleware" | "library" | "schema" | "action";

export type LearningBookmark = {
  day: LearningDay;
  title: string;
  kind: BookmarkKind;
  href?: string;
  codePath: string;
  notes?: string;
};

export const LEARNING_BOOKMARKS: LearningBookmark[] = [
  {
    day: "DAY 1: Foundations & Setup",
    title: "Next.js config (Cache Components enabled)",
    kind: "library",
    codePath: "next.config.ts",
  },
  {
    day: "DAY 1: Foundations & Setup",
    title: "App navigation layout",
    kind: "page",
    codePath: "app/layout.tsx",
    notes: "Top nav links and global layout wrapper.",
  },
  {
    day: "DAY 2: Backend + Prisma Deep Dive",
    title: "Prisma client singleton",
    kind: "library",
    codePath: "lib/db.ts",
  },
  {
    day: "DAY 2: Backend + Prisma Deep Dive",
    title: "Data access layer (all Prisma queries used by pages)",
    kind: "library",
    codePath: "lib/data.ts",
  },
  {
    day: "DAY 2: Backend + Prisma Deep Dive",
    title: "Prisma schema (models + relations)",
    kind: "schema",
    codePath: "prisma/schema.prisma",
  },
  {
    day: "DAY 2: Backend + Prisma Deep Dive",
    title: "REST APIs (Posts/Categories/Users + /all)",
    kind: "api",
    href: "/api/all",
    codePath: "app/api/**/route.ts",
    notes: "Pagination via page/pageSize; CRUD via GET/POST/PUT/PATCH/DELETE.",
  },
  {
    day: "DAY 3: Advanced Features & Architecture",
    title: "Middleware (logging + route protection)",
    kind: "middleware",
    codePath: "middleware.ts",
    href: "/protected",
    notes: "Note: Next warns middleware is deprecated in favor of proxy, but this is kept for the demo.",
  },
  {
    day: "DAY 3: Advanced Features & Architecture",
    title: "Architecture layers demo (Controller → Service → Repository)",
    kind: "library",
    href: "/agencies",
    codePath: "lib/modules/agencies/{controller,service,repository}.ts",
  },
  {
    day: "DAY 3: Advanced Features & Architecture",
    title: "Caching demo (use cache directive)",
    kind: "library",
    href: "/agencies?cached=1",
    codePath: "lib/modules/agencies/service.ts",
  },
  {
    day: "DAY 3: Advanced Features & Architecture",
    title: "Audit logs (advanced feature: cross-cutting concerns)",
    kind: "action",
    href: "/audit-logs",
    codePath: "app/actions.ts + lib/data.ts + app/audit-logs/page.tsx",
    notes: "Writes in transactions and reads with filters + pagination.",
  },
  {
    day: "DAY 3: Advanced Features & Architecture",
    title: "Advanced demo overview page (the 'slides' simulation)",
    kind: "page",
    href: "/advanced",
    codePath: "app/advanced/page.tsx",
  },
  {
    day: "DAY 4: Authentication & SSO (MyIdentity)",
    title: "Demo auth (cookie session) used by middleware",
    kind: "api",
    href: "/login",
    codePath: "app/login/page.tsx + app/api/auth/{login,logout}/route.ts",
    notes: "SSO/MyIdentity is not implemented yet; this is a minimal auth simulation.",
  },
  {
    day: "DAY 5: Integration, Deployment & Teaching Practice",
    title: "Build-ready: Cache Components + Suspense pattern for uncached data",
    kind: "page",
    codePath: "app/**/page.tsx",
    notes: "Tables/pages that fetch DB data render inside <Suspense> to satisfy Cache Components.",
  },
];
