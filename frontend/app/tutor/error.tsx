"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { GameAtmosphere, GameButton, InWorldState } from "@/components/game/GamePrimitives";

export default function TutorError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6">
      <GameAtmosphere universe="portal" />
      <div className="relative z-10 w-full max-w-lg">
        <InWorldState
          universe="portal"
          title="The chamber misfired"
          body="The tutor core hit a fault. Conversation history is still in the log. Recalibrate to reopen the test."
          action={
            <GameButton type="button" universe="portal" onClick={() => retry()}>
              <RefreshCw className="h-4 w-4" />
              Recalibrate chamber
            </GameButton>
          }
        />
      </div>
    </div>
  );
}
