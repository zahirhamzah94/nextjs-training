"use client";

import { useEffect, useState } from "react";

export default function LoginErrorPopup(props: { message: string }) {
  const { message } = props;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [message]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-xl px-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">{message}</div>
          <button
            type="button"
            className="shrink-0 px-2 py-1 rounded border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

