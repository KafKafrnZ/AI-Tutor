"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-zinc-400 text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-zinc-600 text-xs font-mono">ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
