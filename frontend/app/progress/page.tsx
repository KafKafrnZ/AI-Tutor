"use client";

import { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Target, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { API_URL, fetchWithRefresh } from "@/lib/api";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/layout/GlassCard";

interface RecentTest {
  id: number;
  date: string;
  section: string;
  attempted: number;
  correct: number;
  time_taken: number;
}

interface StatsResponse {
  accuracy: number;
  testsTaken: number;
  recent_tests: RecentTest[];
  weak_areas: Record<string, number> | string;
  stats: { avg_accuracy: number; total_tests: number };
}

export default function ProgressPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authError = false;
  const [fetchError, setFetchError] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const response = await fetchWithRefresh(`${API_URL}/stats`, {
        method: "GET",
      });
      if (response.ok) {
        setStats(await response.json());
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchStats();
    });
  }, [fetchStats]);

  const dataStatus = !stats || stats.testsTaken === 0 ? "No replay data" : "Command Sync";
  const formatPercent = (value: unknown, digits = 0) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : "0";
  };

  const accuracyChartData = (stats?.recent_tests ?? [])
    .slice()
    .reverse()
    .map((t, i) => ({
      name: `#${i + 1}`,
      section: t.section || "General",
      accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
    }));

  const weakAreasData =
    stats?.weak_areas && typeof stats.weak_areas === "object"
      ? Object.entries(stats.weak_areas)
          .map(([topic, acc]) => ({ topic, accuracy: Number(acc) }))
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 8)
      : [];

  return (
    <PageShell maxWidth="max-w-5xl" universe="command">
      <PageHeader
        universe="command"
        title="Command Center"
        subtitle="Replay telemetry, tech-tree gaps, and build-order recommendations."
        backHref="/dashboard"
        backLabel="Back to War Room"
      />

        {isLoading ? (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        ) : authError ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent-mock/10 text-accent-mock rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Command Link Expired</h2>
            <p className="text-zinc-500 mb-6">Please log in again to view your analytics.</p>
            <Link href="/login" className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors">
              Log In Again
            </Link>
          </motion.div>
        ) : fetchError ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-accent-mock mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Telemetry uplink failed</h2>
            <p className="text-zinc-500 mb-6">Check your connection and sync the command table again.</p>
            <button onClick={fetchStats}
              className="px-6 py-2 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors">
              Retry
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Ladder Accuracy", value: `${stats?.accuracy ? Number(stats.accuracy).toFixed(1) : "0"}%`, icon: Target, color: "text-accent-progress", delay: 0 },
                { label: "Trials Logged", value: `${stats?.testsTaken || 0}`, icon: BarChart3, color: "text-accent-mock", delay: 0.1 },
                { label: "Data Status", value: dataStatus, icon: TrendingUp, color: "text-primary", delay: 0.2, small: true },
              ].map(({ label, value, icon: Icon, color, delay, small }) => (
                <GlassCard key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
                  className="p-6">
                  <div className={`flex items-center gap-3 mb-4 ${color}`}>
                    <Icon className="w-5 h-5" />
                    <h2 className="font-bold uppercase tracking-wider text-sm">{label}</h2>
                  </div>
                  <p className={`font-black text-white ${small ? "text-2xl" : "text-5xl"}`}>{value}</p>
                </GlassCard>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Accuracy Over Time */}
              <GlassCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-progress" /> Replay Accuracy Trend
                </h3>
                {accuracyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={accuracyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff" }}
                        formatter={(value: unknown): [string, string] => [`${formatPercent(value)}%`, "Accuracy"]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.section ?? label}
                      />
                      <Line type="monotone" dataKey="accuracy" stroke="rgb(var(--ascend-accent-progress))" strokeWidth={2} dot={{ fill: "rgb(var(--ascend-accent-progress))", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-500 text-sm p-4 bg-black/20 rounded-xl border border-white/5 h-[220px] flex items-center justify-center">
                    Run bonfire trials to reveal your replay trend.
                  </div>
                )}
              </GlassCard>

              {/* Weak Areas Bar Chart */}
              <GlassCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-accent-mock" /> Enemy Build Orders
                </h3>
                {weakAreasData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weakAreasData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="topic" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff" }}
                        formatter={(value: unknown): [string, string] => [`${formatPercent(value, 1)}%`, "Accuracy"]}
                      />
                      <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                        {weakAreasData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.accuracy < 40 ? "rgb(var(--ascend-accent-mock))" : entry.accuracy < 65 ? "rgb(var(--ascend-accent-practice))" : "rgb(var(--ascend-accent-progress))"}
                            className="cursor-pointer hover:brightness-110 transition-all"
                            onClick={() => router.push("/error-log")}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-500 text-sm p-4 bg-black/20 rounded-xl border border-white/5 h-[220px] flex items-center justify-center">
                    Not enough telemetry to identify enemy openings yet.
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Recent Activity */}
            <GlassCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent-progress" /> Replay Theater
              </h3>
              {stats?.recent_tests && stats.recent_tests.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {stats.recent_tests.map((test, idx) => {
                    const acc = test.attempted > 0 ? ((test.correct / test.attempted) * 100).toFixed(0) : "0";
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-2xl bg-black/40 border border-white/5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-accent-progress bg-accent-progress/10 px-2 py-0.5 rounded uppercase tracking-wider">
                              {test.section || "General"}
                            </span>
                            <span className="text-xs text-zinc-500">{new Date(test.date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-sm font-medium text-zinc-300 flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-accent-progress"><CheckCircle2 className="w-3 h-3" /> {test.correct}</span>
                            <span className="flex items-center gap-1 text-accent-mock"><XCircle className="w-3 h-3" /> {test.attempted - test.correct}</span>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-white">{acc}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm p-4 bg-black/20 rounded-xl border border-white/5">
                  No replays yet. Complete a bonfire trial to populate the theater.
                </div>
              )}
            </GlassCard>

          </div>
        )}
    </PageShell>
  );
}
