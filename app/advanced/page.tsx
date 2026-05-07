import Link from "next/link";

/**
 * Advanced Features & Architecture "slide" page.
 *
 * Purpose:
 * - Provide a guided entry point into the demo features added to this repo:
 *   - Middleware-based route protection
 *   - Demo auth endpoints (`/api/auth/*`)
 *   - Cache Components + `use cache` (Agencies demo)
 *   - Layered architecture (Controller → Service → Repository)
 *
 * This page is mostly static links + explanations; the actual logic lives in the linked modules/routes.
 */
export default function AdvancedFeatureDemoPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Advanced Features & Architecture Demo</h1>
        <p className="text-black/70 dark:text-white/70">Next.js + Prisma + MySQL simulation</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Middleware</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Runs before request</li>
          <li>Used for auth, logging</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Middleware Example</h2>
        <pre className="rounded border border-black/10 dark:border-white/10 p-3 overflow-x-auto text-xs">
          {"export function middleware(req) {\n  return NextResponse.next();\n}"}
        </pre>
        <div className="text-sm">
          Implemented in{" "}
          <span className="font-mono">middleware.ts</span> and protects{" "}
          <Link href="/protected" className="text-blue-600 hover:underline">
            /protected
          </Link>
          .
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Route Protection</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Protect pages</li>
          <li>Redirect unauthorized users</li>
        </ul>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/protected" className="text-blue-600 hover:underline">
            Try protected page
          </Link>
          <Link href="/login" className="text-blue-600 hover:underline">
            Login (demo)
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Caching</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Improve performance</li>
          <li>Reduce DB load</li>
        </ul>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/agencies?cached=1" className="text-blue-600 hover:underline">
            Agencies (cached)
          </Link>
          <Link href="/agencies?cached=0" className="text-blue-600 hover:underline">
            Agencies (uncached)
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Architecture Layers</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Controller</li>
          <li>Service</li>
          <li>Repository</li>
        </ul>
        <div className="text-sm text-black/70 dark:text-white/70">
          Example feature: <span className="font-mono">agencies</span> via <span className="font-mono">/api/agencies</span>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Clean Architecture</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Separation of concerns</li>
          <li>Maintainability</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Scaling Applications</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Modular code</li>
          <li>Reusable components</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Common Mistakes</h2>
        <ul className="list-disc pl-5 text-black/80 dark:text-white/80">
          <li>Tight coupling</li>
          <li>No separation</li>
        </ul>
      </section>
    </div>
  );
}
