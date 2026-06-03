"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, BarChart3, Target, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

// FE-5 FIX: Removed "any" and added strict TypeScript interfaces
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
  stats: {
    avg_accuracy: number;
    total_tests: number;
  };
}

export default function ProgressPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // SEC-2 FIX: Removed localStorage token dependency. 
        // We now rely purely on the secure httpOnly cookie via credentials: "include"
        const response = await fetch(`${API_URL}/stats`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", 
        });

        if (response.ok) {
          const data: StatsResponse = await response.json();
          setStats(data);
          setAuthError(false);
        } else {
          console.error("Failed to authenticate with backend. Status:", response.status);
          setAuthError(true);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // FE-4 FIX: Dynamic Data Status logic instead of hardcoded text
  const dataStatus = !stats || stats.testsTaken === 0 
    ? "No data yet" 
    : "Active & Syncing";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 md:p-12 relative z-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Your Analytics
          </h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : authError ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 shadow-xl backdrop-blur-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
              <p className="text-zinc-500 mb-6">Your session has expired or is invalid.</p>
              <Link href="/login" className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors">
                 Log In Again
              </Link>
            </motion.div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                  <Target className="w-5 h-5" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Overall Accuracy</h2>
                </div>
                <p className="text-5xl font-black text-white">{stats?.accuracy ? Number(stats.accuracy).toFixed(1) : "0"}%</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4 text-pink-400">
                  <BarChart3 className="w-5 h-5" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Tests Taken</h2>
                </div>
                <p className="text-5xl font-black text-white">{stats?.testsTaken || "0"}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4 text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Data Status</h2>
                </div>
                <p className={`text-2xl font-bold ${dataStatus === "Active & Syncing" ? "text-white" : "text-zinc-500"}`}>
                  {dataStatus}
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* FE-4 FIX: Weak Areas Visualization */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" /> Focus Areas
                </h3>
                {stats?.weak_areas && typeof stats.weak_areas === "object" && Object.keys(stats.weak_areas).length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {Object.entries(stats.weak_areas).map(([topic, accuracy]) => (
                      <div key={topic} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-rose-500/10">
                        <span className="font-medium text-zinc-300">{topic}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-500">Accuracy</span>
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 font-bold rounded-lg text-sm border border-rose-500/20">
                            {Number(accuracy).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm p-4 bg-black/20 rounded-xl border border-white/5">
                    Not enough mock test data to determine weak areas yet. Keep practicing!
                  </div>
                )}
              </motion.div>

              {/* FE-4 FIX: Recent Activity Table */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" /> Recent Activity
                </h3>
                {stats?.recent_tests && stats.recent_tests.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {stats.recent_tests.map((test, idx) => {
                      const testAccuracy = test.attempted > 0 
                        ? ((test.correct / test.attempted) * 100).toFixed(0) 
                        : "0";
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-2xl bg-black/40 border border-white/5 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                {test.section || "General"}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {new Date(test.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-zinc-300 flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3"/> {test.correct}</span>
                              <span className="flex items-center gap-1 text-rose-400"><XCircle className="w-3 h-3"/> {test.attempted - test.correct}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-white">{testAccuracy}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm p-4 bg-black/20 rounded-xl border border-white/5">
                    No recent tests found. Take a mock test to see your history.
                  </div>
                )}
              </motion.div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}