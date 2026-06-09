import Link from "next/link";
import { Compass } from "lucide-react";
import { GameAtmosphere } from "@/components/game/GamePrimitives";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-bg flex items-center justify-center p-6 overflow-hidden">
      <GameAtmosphere universe="neuro" />
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-6xl font-black text-white mb-2">404</h1>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Fast Travel Failed</p>
        <h2 className="text-xl font-bold text-zinc-300 mb-3">This route is outside the map.</h2>
        <p className="text-zinc-500 mb-8">
          The coordinates do not exist, or this region has been moved behind a fog gate.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
        >
          Back to Public Gate
        </Link>
      </div>
    </div>
  );
}
