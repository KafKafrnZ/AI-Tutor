"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { GameAtmosphere } from "@/components/game/GamePrimitives";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-bg flex items-center justify-center p-6 overflow-hidden">
      <GameAtmosphere universe="neuro" />
      <div className="relative z-10 max-w-md w-full bg-zinc-900/50 border border-accent-mock/20 rounded-[var(--radius-token)] p-8 text-center">
        <div className="w-16 h-16 bg-accent-mock/10 rounded-[var(--radius-token)] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-accent-mock" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-mock">Simulation Fault</p>
        <h2 className="text-xl font-bold text-white mb-2">The chamber misfired.</h2>
        <p className="text-zinc-400 text-sm mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={unstable_retry}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Restart segment
        </button>
      </div>
    </div>
  );
}
