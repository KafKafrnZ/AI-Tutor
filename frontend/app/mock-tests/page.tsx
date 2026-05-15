"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Clock, ChevronRight, Brain, Target, BookOpen } from "lucide-react";
import { MouseEvent } from "react";

const mockTests = [
  { id: 1, title: "Full IBPS SO 2025 Mock - Set 1", duration: "120 min", questions: "150 Qs", difficulty: "Hard", difficultyColor: "text-rose-400 border-rose-500/20 bg-rose-500/5", icon: Brain, iconColor: "text-rose-500 bg-rose-500/10" },
  { id: 2, title: "Reasoning + Quant Special", duration: "90 min", questions: "100 Qs", difficulty: "Medium", difficultyColor: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: Target, iconColor: "text-amber-500 bg-amber-500/10" },
  { id: 3, title: "English + GA Combined", duration: "60 min", questions: "80 Qs", difficulty: "Easy", difficultyColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: BookOpen, iconColor: "text-emerald-500 bg-emerald-500/10" }
];

export default function MockTestsPage() {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-900/20 text-white"><FileText className="w-6 h-6" /></div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Mock Tests</h1>
              <p className="text-zinc-400 mt-1">Full-length exams with AI grading and analytics.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTests.map((test) => (
            <motion.div key={test.id} whileHover={{ y: -5 }} onMouseMove={handleMouseMove} className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 group transition-all overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)` }} />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${test.iconColor}`}><test.icon className="w-6 h-6" /></div>
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${test.difficultyColor}`}>{test.difficulty}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">{test.title}</h3>
                <div className="flex items-center gap-4 text-zinc-500 text-sm mb-8 font-medium">
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {test.duration}</div>
                  <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {test.questions}</div>
                </div>
                <Link href={`/mock-tests/${test.id}`} className="block w-full">
                  <button className="w-full py-4 rounded-xl bg-zinc-950 border border-white/5 text-zinc-300 font-semibold hover:bg-white hover:text-black hover:border-transparent transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    Start Mock Test <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}