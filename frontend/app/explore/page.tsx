"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreeDExplorer from "@/components/ThreeDExplorer";

export default function ExplorePage() {
  return (
    <div className="h-screen w-full bg-[#050810] flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Gradient Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 via-transparent to-[#00D4FF]/10 z-0" />

      {/* Header */}
      <div className="h-20 flex items-center px-6 relative z-10 shrink-0">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/40 text-zinc-300 hover:text-white hover:bg-black/60 backdrop-blur-xl transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Back to Dashboard</span>
        </Link>
      </div>

      {/* Explorer Container */}
      <div className="flex-1 w-full p-6 pt-0 relative z-10">
        <ThreeDExplorer />
      </div>

    </div>
  );
}
