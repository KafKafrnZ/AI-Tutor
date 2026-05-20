"use client";

import { motion } from "framer-motion";
import BlackholeBackground from "@/components/ui/Blackhole";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [meteors, setMeteors] = useState<{ id: number; top: number; left: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate random meteors
    const generatedMeteors = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100 - 20, 
      left: Math.random() * 150 - 50, 
      delay: Math.random() * 5,
      duration: Math.random() * 2 + 2, 
    }));
    setMeteors(generatedMeteors);
  }, []);

  return (
    <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* The Shooting Stars */}
      {meteors.map((m) => (
        <span
          key={m.id}
          className="animate-shooting-star absolute h-0.5 w-0 bg-gradient-to-r from-transparent via-amber-200 to-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
          style={{ top: `${m.top}%`, left: `${m.left}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full blur-[2px]" />
        </span>
      ))}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-zinc-300 text-sm font-medium mb-8 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" /> Powered by Llama-3 Advanced RAG
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
          Master Your Exam with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Intelligent AI Tutoring.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
          Stop guessing what to study. Our AI analyzes your weak points, generates custom mock tests, and provides real-time evaluations to guarantee your success.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/signup">
            <button className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all">Start Learning Free</button>
          </Link>
          <Link href="/dashboard">
            <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all">View Dashboard</button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}