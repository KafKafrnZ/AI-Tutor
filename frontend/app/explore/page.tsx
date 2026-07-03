"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreeDExplorer from "@/components/ThreeDExplorer";
import { GameAtmosphere } from "@/components/game/GamePrimitives";

export default function ExplorePage() {
  return (
    <div className="h-dvh w-full bg-bg flex flex-col relative overflow-hidden font-sans">
      <GameAtmosphere universe="elden" intensity="loud" />

      {/* Header */}
      <div className="h-20 flex items-center px-6 relative z-10 shrink-0">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/40 text-zinc-300 hover:text-white hover:bg-black/60 backdrop-blur-xl transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Back to War Room</span>
        </Link>
        <div className="ml-4 hidden md:block">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-elden">Guidance of Grace</p>
          <h1 className="text-xl font-black text-white">Lands Between Knowledge</h1>
        </div>
      </div>

      {/* Explorer Container */}
      <div className="flex-1 w-full p-6 pt-0 relative z-10">
        <ThreeDExplorer />
      </div>

    </div>
  );
}
