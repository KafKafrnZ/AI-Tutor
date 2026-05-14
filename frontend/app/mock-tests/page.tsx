"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, TestTube, Clock, FileText, ChevronRight, Award } from "lucide-react";

const mockTests = [
  {
    title: "Full IBPS SO 2025 Mock - Set 1",
    difficulty: "Hard",
    time: "120 min",
    questions: 150,
    color: "from-rose-500 to-red-600",
    shadow: "shadow-rose-900/20",
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  {
    title: "Reasoning + Quant Special",
    difficulty: "Medium",
    time: "90 min",
    questions: 100,
    color: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-900/20",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    title: "English + GA Combined",
    difficulty: "Easy",
    time: "60 min",
    questions: 80,
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-900/20",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  }
];

export default function MockTestsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-900/20">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Mock Tests</h1>
                <p className="text-zinc-400 mt-1">Full-length exams with AI grading and analytics.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium">
              <Award className="w-4 h-4" />
              <span>3 Active Tests</span>
            </div>
          </div>

          {/* Test Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mockTests.map((test, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col hover:bg-zinc-900 transition-colors group relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${test.color} opacity-5 blur-[80px] group-hover:opacity-10 transition-opacity`} />

                <div className="flex justify-between items-start mb-6">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${test.color} flex items-center justify-center shadow-lg ${test.shadow}`}>
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border tracking-wide uppercase ${test.badge}`}>
                    {test.difficulty}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-6 leading-tight">
                  {test.title}
                </h3>

                <div className="flex items-center gap-6 text-sm text-zinc-400 mb-8 mt-auto">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {test.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {test.questions} Qs
                  </div>
                </div>

                <button className="w-full py-4 rounded-xl bg-zinc-800 text-white font-medium hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                  Start Mock Test
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}