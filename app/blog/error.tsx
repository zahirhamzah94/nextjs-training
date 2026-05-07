"use client";
/**
 * Route-level error boundary for `/blog`.
 *
 * Flow:
 * - Next.js renders this component when an error is thrown while rendering/loading `/blog`.
 * - `reset()` retries the rendering for the route segment.
 */
export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
return (
<div className="p-4 bg-red-50 border border-red-200 text-red-800">
<h2 className="font-bold">Something went wrong!</h2>
<p>{error.message}</p>
<button onClick={() => reset()} className="mt-2 underline">Try again</button>
</div>
);
}
