"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, ChevronRight, Brain, Target, BookOpen, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";
import { API_URL, fetchWithRefresh } from "@/lib/api";
import { fallbackMockTests } from "@/lib/mockFallback";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/layout/GlassCard";

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
  Hard: "text-accent-mock border-accent-mock/20 bg-accent-mock/5",
  Medium: "text-accent-practice border-accent-practice/20 bg-accent-practice/5",
  Easy: "text-accent-progress border-accent-progress/20 bg-accent-progress/5",
};

const icons: Record<number, LucideIcon> = {
  1: Brain,
  2: Target,
  3: BookOpen,
};
const iconColors: Record<number, string> = {
  1: "text-accent-mock bg-accent-mock/10",
  2: "text-accent-practice bg-accent-practice/10",
  3: "text-accent-progress bg-accent-progress/10",
};

export default function MockTestsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithRefresh(`${API_URL}/mock-tests`, { method: "GET" });
        if (!res.ok) {
          throw new Error(`Mock test list returned ${res.status}`);
        }

        const data = await res.json();
        const nextTests = Array.isArray(data.tests) ? data.tests : [];
        if (nextTests.length > 0) {
          setTests(nextTests);
          setLoadNotice("");
        } else if (process.env.NODE_ENV !== "production") {
          setTests(fallbackMockTests);
          setLoadNotice("Starter bonfire trials are visible because no seeded trials are available yet.");
        } else {
          setTests([]);
          setLoadNotice("No bonfire trials are prepared yet. Check back soon.");
        }
      } catch (e) {
        console.error("Failed to load mock tests list", e);
        if (process.env.NODE_ENV !== "production") {
          setTests(fallbackMockTests);
          setLoadNotice("The trial catalog is unreachable, so local starter bonfires are shown.");
        } else {
          setTests([]);
          setLoadNotice("No bonfire trials are prepared yet. Check back soon.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageShell maxWidth="max-w-6xl" universe="souls">
      <div className="mt-2">
        <PageHeader
          universe="souls"
          title="Bonfire Trials"
          subtitle="Full-length simulations with hollowing penalties, posture breaks, and a precise post-mortem."
        />

        {loadNotice && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-accent-practice/20 bg-accent-practice/10 px-4 py-3 text-sm text-accent-practice">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadNotice}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="animate-spin" /> Kindling available trials...</div>
        ) : tests.length === 0 ? (
          <div className="text-zinc-400">No trials available yet. Seed the question realm or add questions via DB.</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const Icon = icons[test.id] || FileText;
            const iconColor = iconColors[test.id] || "text-zinc-400 bg-white/10";
            const diffColor = difficultyStyles[test.difficulty] || difficultyStyles.Medium;
            const dur = `${test.duration_minutes} min`;
            const qstr = `${test.question_count || "?"} Qs`;
            return (
              <GlassCard key={test.id} interactive whileHover={{ y: -5 }} className="p-6 transition-all overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}><Icon className="w-6 h-6" /></div>
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${diffColor}`}>{test.difficulty}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-mock transition-colors">{test.title}</h3>
                  <div className="flex items-center gap-4 text-zinc-500 text-sm mb-8 font-medium">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {dur}</div>
                    <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {qstr}</div>
                    {test.is_fallback && <span className="text-accent-practice">Generated</span>}
                  </div>
                  <Link href={`/mock-tests/${test.id}`} className="block w-full">
                    <button className="w-full py-4 rounded-xl bg-zinc-950 border border-white/5 text-zinc-300 font-semibold hover:bg-white hover:text-black hover:border-transparent transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      Enter the Fog Gate <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
        )}
      </div>
    </PageShell>
  );
}
