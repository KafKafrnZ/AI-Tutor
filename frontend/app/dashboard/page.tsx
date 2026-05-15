"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Target, FileText, ChevronRight } from "lucide-react";
import { MouseEvent } from "react";

const tools = [
  { id: "tutor", title: "AI Tutor", desc: "Instant, accurate answers with RAG", icon: Bot, color: "text-violet-400", bg: "bg-violet-500/10", link: "/tutor" },
  { id: "practice", title: "Practice Arena", desc: "Adaptive questions by topic", icon: Target, color: "text-amber-400", bg: "bg-amber-500/10", link: "/practice" },
  { id: "mock", title: "Mock Tests", desc: "Full-length IBPS SO mocks", icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10", link: "/mock-tests" }
];

export default function DashboardPage() {
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
      <div className="max-w-6xl mx-auto mt-10">
        <h1 className="text-3xl font-bold text-white mb-10 tracking-tight">Dashboard Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool, i) => (
            <Link key={tool.id} href={tool.link}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                onMouseMove={handleMouseMove}
                className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 h-48 flex flex-col justify-between group transition-all overflow-hidden cursor-pointer"
              >
                {/* Spotlight Layer */}
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
      </div>
    </div>
  );
}