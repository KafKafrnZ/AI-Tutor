"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { GameAtmosphere } from "@/components/game/GamePrimitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="relative min-h-screen bg-bg flex items-center justify-center p-6 overflow-hidden">
          <GameAtmosphere universe="neuro" />
          <div className="relative z-10 max-w-md w-full bg-zinc-900/50 border border-accent-mock/20 rounded-[var(--radius-token)] p-8 text-center">
            <div className="w-16 h-16 bg-accent-mock/10 rounded-[var(--radius-token)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-accent-mock" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-mock">Neuro-OS Fault</p>
            <h2 className="text-xl font-bold text-white mb-2">The core hit an unexpected state.</h2>
            <p className="text-zinc-400 text-sm mb-2">
              An unexpected error occurred. Please refresh the page.
            </p>
            {process.env.NEXT_PUBLIC_SENTRY_DSN && (
              <p className="text-zinc-500 text-xs mb-6">Error reported automatically.</p>
            )}
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reboot interface
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
