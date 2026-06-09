"use client";

import { useEffect } from "react";
import { Bot, RefreshCw } from "lucide-react";

export default function TutorError({
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
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Bot className="w-8 h-8 text-accent opacity-50" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Tutor unavailable</h2>
      <p className="text-zinc-400 text-sm mb-6">
        The AI tutor ran into a problem. Your conversation history is safe.
      </p>
      <button
        onClick={unstable_retry}
        className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reload tutor
      </button>
    </div>
  );
}
