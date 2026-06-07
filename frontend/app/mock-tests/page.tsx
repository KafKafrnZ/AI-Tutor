"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Clock, ChevronRight, Brain, Target, BookOpen, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";
import { MouseEvent } from "react";
import { API_URL } from "@/lib/api";
import { fallbackMockTests } from "@/lib/mockFallback";

interface MockTest {
  id: number;
  title: string;
  duration_minutes: number;
  question_count: number;
  difficulty: string;
  is_fallback?: boolean;
  source?: string;
}

const difficultyStyles: Record<string, string> = {
  Hard: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  Medium: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  Easy: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
};

const icons: Record<number, LucideIcon> = {
  1: Brain,
  2: Target,
  3: BookOpen,
};
const iconColors: Record<number, string> = {
  1: "text-rose-500 bg-rose-500/10",
  2: "text-amber-500 bg-amber-500/10",
  3: "text-emerald-500 bg-emerald-500/10",
};

export default function MockTestsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/mock-tests`, { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Mock test list returned ${res.status}`);
        }

        const data = await res.json();
        const nextTests = Array.isArray(data.tests) ? data.tests : [];
        if (nextTests.length > 0) {
          setTests(nextTests);
          setLoadNotice("");
        } else {
          setTests(fallbackMockTests);
          setLoadNotice("Showing generated starter mocks because no seeded tests are available yet.");
        }
      } catch (e) {
        console.error("Failed to load mock tests list", e);
        setTests(fallbackMockTests);
        setLoadNotice("Backend mock catalog is unavailable, so local starter mocks are shown.");
      } finally {
        setLoading(false);
      }
    }
    load();
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
    <div className="min-h-screen bg-[#09090b] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-900/20 text-white"><FileText className="w-6 h-6" /></div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Mock Tests</h1>
              <p className="text-zinc-400 mt-1">Timed government-exam practice with AI grading and analytics.</p>
            </div>
          </div>
        </div>

        {loadNotice && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadNotice}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="animate-spin" /> Loading available tests...</div>
        ) : tests.length === 0 ? (
          <div className="text-zinc-400">No tests available yet. Run the seeder or add questions via DB.</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const Icon = icons[test.id] || FileText;
            const iconColor = iconColors[test.id] || "text-zinc-400 bg-white/10";
            const diffColor = difficultyStyles[test.difficulty] || difficultyStyles.Medium;
            const dur = `${test.duration_minutes} min`;
            const qstr = `${test.question_count || "?"} Qs`;
            return (
              <motion.div key={test.id} whileHover={{ y: -5 }} onMouseMove={handleMouseMove} className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 group transition-all overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)` }} />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}><Icon className="w-6 h-6" /></div>
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${diffColor}`}>{test.difficulty}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">{test.title}</h3>
                  <div className="flex items-center gap-4 text-zinc-500 text-sm mb-8 font-medium">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {dur}</div>
                    <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {qstr}</div>
                    {test.is_fallback && <span className="text-amber-300">Generated</span>}
                  </div>
                  <Link href={`/mock-tests/${test.id}`} className="block w-full">
                    <button className="w-full py-4 rounded-xl bg-zinc-950 border border-white/5 text-zinc-300 font-semibold hover:bg-white hover:text-black hover:border-transparent transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      Start Mock Test <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
