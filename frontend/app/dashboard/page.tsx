"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Target, FileText, ChevronRight, BrainCircuit, CheckCircle2, Sparkles, Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL, fetchWithRefresh } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/layout/GlassCard";
import { StatBadge } from "@/components/layout/StatBadge";

interface RevisionPlan {
  primary_weakness: string;
  critical_concepts: string[];
  actionable_checklist: string[];
}

const tools = [
  { id: "tutor", title: "Aperture Chamber", desc: "Run concept tests with the tutor core", icon: Bot, color: "text-accent", bg: "bg-accent/10", link: "/tutor" },
  { id: "explore", title: "Grace Map", desc: "Chart the 3D syllabus realm", icon: Compass, color: "text-primary", bg: "bg-primary/10", link: "/explore" },
  { id: "practice", title: "Slayer Arena", desc: "Fast adaptive drills by target", icon: Target, color: "text-accent-practice", bg: "bg-accent-practice/10", link: "/practice" },
  { id: "mock", title: "Bonfire Trials", desc: "High-stakes mocks with post-mortems", icon: FileText, color: "text-accent-mock", bg: "bg-accent-mock/10", link: "/mock-tests" }
];

export default function DashboardPage() {
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [modelName, setModelName] = useState<string>("AI Active");
  const router = useRouter();

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/revision-plan`, {
          method: "GET",
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

  useEffect(() => {
    fetch("/api/health", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.model) setModelName(`${data.model} Active`);
      })
      .catch(() => {});
  }, []);

  return (
    <PageShell maxWidth="max-w-6xl" universe="witcher">
      <div className="mt-2">
        <PageHeader 
          universe="witcher"
          title="Kaer Morhen War Room"
          subtitle="Contracts, bounties, and fast travel for today's government-exam hunt."
          actions={<StatBadge icon={<Sparkles className="text-accent" />} label={modelName} color="zinc" />}
        />
        
        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tools.map((tool, i) => (
            <Link key={tool.id} href={tool.link}>
              <GlassCard 
                interactive 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 h-auto min-h-[140px] md:h-48 flex flex-col justify-between"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tool.bg}`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{tool.title}</h3>
                    <p className="text-zinc-400 text-sm font-medium">{tool.desc}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-auto">
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* AI Study Strategy Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-3xl p-8 relative overflow-hidden"
        >
          {/* Decorative Background Blob */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-accent/20 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Geralt&apos;s Journal</h2>
              <p className="text-zinc-400 text-sm">Calculated from shades in your Mistake Locker</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-40" />
                <div className="flex flex-wrap gap-2">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-24" />)}
                </div>
              </div>
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : plan ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              
              {/* Left Column: Weakness & Concepts */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Highest Bounty</h4>
                  <div className="inline-block px-4 py-2 bg-accent-mock/10 border border-accent-mock/20 rounded-lg text-accent-mock font-semibold">
                    {plan.primary_weakness}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Signs to Prepare</h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.critical_concepts.map((concept, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => router.push(`/tutor?q=${encodeURIComponent(`Explain ${concept}`)}`)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-accent/20 border border-white/10 hover:border-accent/30 rounded-md text-zinc-300 hover:text-accent text-sm transition-colors cursor-pointer"
                      >
                        {concept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Checklist */}
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" /> Contract Checklist
                </h4>
                <ul className="space-y-3">
                  {plan.actionable_checklist.map((step, idx) => {
                    const isChecked = !!checkedSteps[idx];
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          aria-pressed={isChecked}
                          className={`flex w-full items-start gap-3 text-left text-sm cursor-pointer p-2 rounded-lg transition-colors border focus:outline-none focus:ring-2 focus:ring-accent/50 ${isChecked ? 'bg-accent-progress/10 border-accent-progress/20 text-zinc-400 line-through' : 'bg-transparent border-transparent text-zinc-300 hover:bg-white/5'}`}
                        >
                          <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${isChecked ? 'text-accent-progress' : 'text-zinc-600'}`} />
                          <span className="leading-relaxed">{step}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center relative z-10">
              <div className="w-16 h-16 bg-white/5 text-zinc-400 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <BrainCircuit className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Notice Board Awaiting Monsters</h3>
              <p className="text-zinc-500 mb-6 max-w-sm">Complete a trial or arena run. The medallion will read your mistakes and pin a smarter contract here.</p>
              <Link href="/mock-tests">
                <button className="px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors shadow-lg shadow-accent/20">
                  Kindle a Bonfire Trial
                </button>
              </Link>
            </div>
          )}
        </motion.div>

      </div>
    </PageShell>
  );
}
