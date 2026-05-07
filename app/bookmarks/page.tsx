import Link from "next/link";

import { LEARNING_BOOKMARKS, type LearningDay } from "@/lib/bookmarks";

/**
 * Bookmarks page.
 *
 * Purpose:
 * - Render the curated list in `lib/bookmarks.ts` grouped into DAY 1..DAY 5.
 *
 * Flow:
 * - For each day, filter `LEARNING_BOOKMARKS` and render cards with:
 *   - title/kind
 *   - optional navigation link (`href`)
 *   - code reference path (`codePath`)
 */
const days: LearningDay[] = [
  "DAY 1: Foundations & Setup",
  "DAY 2: Backend + Prisma Deep Dive",
  "DAY 3: Advanced Features & Architecture",
  "DAY 4: Authentication & SSO (MyIdentity)",
  "DAY 5: Integration, Deployment & Teaching Practice",
];

export default function BookmarksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Learning Bookmarks</h1>
        <p className="text-black/70 dark:text-white/70">
          Functions, logic, and operations grouped by day for your training plan.
        </p>
      </header>

      {days.map((day) => {
        const items = LEARNING_BOOKMARKS.filter((b) => b.day === day);
        return (
          <section key={day} className="space-y-3">
            <h2 className="text-xl font-semibold">{day}</h2>
            {items.length === 0 ? (
              <div className="text-black/70 dark:text-white/70">No bookmarks yet.</div>
            ) : (
              <div className="space-y-2">
                {items.map((b) => (
                  <div
                    key={`${b.day}:${b.title}:${b.codePath}`}
                    className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="font-semibold">{b.title}</div>
                      <span className="inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium">
                        {b.kind}
                      </span>
                      {b.href ? (
                        <Link href={b.href} className="text-sm text-blue-600 hover:underline">
                          Open
                        </Link>
                      ) : null}
                    </div>
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Code: <span className="font-mono">{b.codePath}</span>
                    </div>
                    {b.notes ? <div className="text-sm text-black/70 dark:text-white/70">{b.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

