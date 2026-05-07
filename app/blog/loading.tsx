/**
 * Route-level loading UI for `/blog`.
 * Displayed while the page (and any data it needs) is being streamed.
 */
export default function Loading() {
  return (
    <p className="text-gray-500 animate-pulse">Loading blog posts...</p>
  );
}
