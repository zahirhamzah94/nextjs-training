import Counter from "@/components/Counter";

/**
 * Blog page (example placeholder).
 *
 * Purpose:
 * - Demonstrates rendering a Client Component (`<Counter/>`) from a Server Component page.
 */
export default function AboutPage() { return (
<div>
<h1 className="text-3xl font-bold mb-4">About Us</h1>
<p>This Server Component renders a Client Component below:</p>
<Counter />
</div>
);
}
