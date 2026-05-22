"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Target, FileText, ChevronRight, BrainCircuit, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { MouseEvent, useEffect, useState } from "react";

interface RevisionPlan {
  primary_weakness: string;
  critical_concepts: string[];
  actionable_checklist: string[];
}

const tools = [
  { id: "tutor", title: "AI Tutor", desc: "Instant, accurate answers with RAG", icon: Bot, color: "text-violet-400", bg: "bg-violet-500/10", link: "/tutor" },
  { id: "practice", title: "Practice Arena", desc: "Adaptive questions by topic", icon: Target, color: "text-amber-400", bg: "bg-amber-500/10", link: "/practice" },
  { id: "mock", title: "Mock Tests", desc: "Full-length IBPS SO mocks", icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10", link: "/mock-tests" }
];

export default function DashboardPage() {
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://ai-tutor-production-43fe.up.railway.app";
        const res = await fetch(`${apiUrl}/revision-plan`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok && !data.error) {
          setPlan(data);
        }
      } catch (err) {
        console.error("Failed to fetch AI plan", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-8 font-sans">
      <div className="max-w-6xl mx-auto mt-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-zinc-300">Llama-3 Active</span>
          </div>
        </div>
        
        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tools.map((tool, i) => (
            <Link key={tool.id} href={tool.link}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                onMouseMove={handleMouseMove}
                className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 h-48 flex flex-col justify-between group transition-all overflow-hidden cursor-pointer"
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
                  style={{ background: `radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)` }} 
                />
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.bg}`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{tool.title}</h3>
                    <p className="text-zinc-400 text-sm font-medium">{tool.desc}</p>
                  </div>
                </div>
                <div className="relative z-10 flex justify-end">
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* AI Study Strategy Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden"
        >
          {/* Decorative Background Blob */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-indigo-500/20 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Dynamic AI Strategy</h2>
              <p className="text-zinc-400 text-sm">Calculated from your Mistake Locker</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
              <p className="text-zinc-400 font-medium animate-pulse">Analyzing neural patterns...</p>
            </div>
          ) : plan ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              
              {/* Left Column: Weakness & Concepts */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Primary Weakness</h4>
                  <div className="inline-block px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 font-semibold">
                    {plan.primary_weakness}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Critical Concepts to Review</h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.critical_concepts.map((concept, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-zinc-300 text-sm">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Checklist */}
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" /> Target Checklist
                </h4>
                <ul className="space-y-3">
                  {plan.actionable_checklist.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500/70 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">
              <p>Unable to load strategy. Please try again later.</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}