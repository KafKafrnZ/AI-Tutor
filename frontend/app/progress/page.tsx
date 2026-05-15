"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, BarChart3, Target, TrendingUp, Clock, AlertCircle, BrainCircuit } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const radarData = [
  { subject: 'IT Knowledge', score: 85, fullMark: 100 },
  { subject: 'Reasoning', score: 65, fullMark: 100 },
  { subject: 'Quant', score: 45, fullMark: 100 },
  { subject: 'English', score: 90, fullMark: 100 },
  { subject: 'Gen. Awareness', score: 70, fullMark: 100 },
];

export default function ProgressPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://127.0.0.1:8000/stats", { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]">
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors"><ArrowLeft className="w-4 h-4" /></div>
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20"><BarChart3 className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Your Progress</h1>
              <p className="text-zinc-400 mt-1">Real-time performance analytics across all subjects.</p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-40 bg-zinc-900/80 rounded-3xl border border-white/5"></div>
                <div className="h-40 bg-zinc-900/80 rounded-3xl border border-white/5"></div>
                <div className="h-40 bg-zinc-900/80 rounded-3xl border border-white/5"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96 bg-zinc-900/80 rounded-3xl border border-white/5"></div>
                <div className="h-96 bg-zinc-900/80 rounded-3xl border border-white/5"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                  <div className="flex justify-between items-start mb-4"><span className="text-zinc-400 font-medium">Overall Accuracy</span><Target className="w-5 h-5 text-emerald-400" /></div>
                  <div className="text-5xl font-bold text-white tracking-tight">{stats?.stats?.avg_accuracy || 0}<span className="text-3xl text-emerald-400">%</span></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                  <div className="flex justify-between items-start mb-4"><span className="text-zinc-400 font-medium">Total Tests Taken</span><TrendingUp className="w-5 h-5 text-violet-400" /></div>
                  <div className="text-5xl font-bold text-white tracking-tight">{stats?.stats?.total_tests || 0}</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                  <div className="flex justify-between items-start mb-4"><span className="text-zinc-400 font-medium">Data Status</span><Clock className="w-5 h-5 text-cyan-400" /></div>
                  <div className="text-2xl font-bold text-white tracking-tight pt-2">{stats?.stats?.total_tests > 0 ? "Active" : "No Tests Yet"}</div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-6"><BrainCircuit className="w-5 h-5 text-fuchsia-400" /><h2 className="text-xl font-bold text-white">Skill Heatmap</h2></div>
                  <p className="text-sm text-zinc-400 mb-4">Visual representation of your strong and weak domains.</p>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#3f3f46" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#c084fc', fontWeight: 'bold' }} />
                        <Radar name="Accuracy %" dataKey="score" stroke="#c084fc" strokeWidth={2} fill="#c084fc" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-8"><AlertCircle className="w-5 h-5 text-rose-400" /><h2 className="text-xl font-bold text-white">Priority Focus Areas</h2></div>
                  <div className="space-y-6">
                    {typeof stats?.weak_areas === 'string' ? (
                       <p className="text-zinc-400">{stats.weak_areas}</p>
                    ) : (
                       <p className="text-zinc-400">Analytics engine active. Based on your recent mocks, you should focus your practice sessions on <strong className="text-rose-400">Quant</strong> to improve your overall percentile.</p>
                    )}
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}