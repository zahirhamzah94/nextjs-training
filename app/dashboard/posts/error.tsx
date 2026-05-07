"use client";

export default function PostsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="bg-red-100 text-red-700 p-4 rounded">
      <h3>Failed to load posts or perform action: {error.message}</h3>
      <button onClick={reset} className="underline">
        Retry
      </button>
    </div>
  );
}