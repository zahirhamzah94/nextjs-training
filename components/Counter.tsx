
"use client";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="mt-4 p-4 border rounded">
        <p className="mb-2">Current Count: {count}</p>
        <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Increment
        </button>
    </div>
  );
}
