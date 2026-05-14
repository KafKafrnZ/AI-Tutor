"use client";

import { useRouter } from 'next/navigation';
import { Bot, BookOpen, TestTube, Zap } from 'lucide-react';
import { Card } from "@/components/ui/card";

export default function DashboardHome() {
  const router = useRouter();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mb-8 text-white">
        <Zap className="text-violet-400" /> Dashboard Overview
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 transition-all cursor-pointer group shadow-xl" onClick={() => router.push('/tutor')}>
          <Bot className="w-14 h-14 text-violet-400 mb-6 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-semibold mb-1 text-white">AI Tutor</h3>
          <p className="text-zinc-400">Instant, accurate answers with RAG</p>
        </Card>

        <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer group shadow-xl" onClick={() => router.push('/practice')}>
          <BookOpen className="w-14 h-14 text-amber-400 mb-6 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-semibold mb-1 text-white">Practice Arena</h3>
          <p className="text-zinc-400">Adaptive questions by topic</p>
        </Card>

        <Card className="p-8 bg-zinc-900/50 border-zinc-800 hover:border-rose-500/50 transition-all cursor-pointer group shadow-xl" onClick={() => router.push('/mock-tests')}>
          <TestTube className="w-14 h-14 text-rose-400 mb-6 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-semibold mb-1 text-white">Mock Tests</h3>
          <p className="text-zinc-400">Full-length IBPS SO mocks</p>
        </Card>
      </div>
    </div>
  );
}