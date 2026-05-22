"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, BarChart3, Target, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ProgressPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.warn("No token found. User needs to log in.");
        setAuthError(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("https://ai-tutor-production-43fe.up.railway.app/stats", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // The VIP Pass
          }
        });

        if (response.ok) {
          const data = await response.json();
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 md:p-12 relative z-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Your Progress
          </h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <Target className="w-5 h-5" />
                <h2 className="font-bold">Overall Accuracy</h2>
              </div>
              <p className="text-4xl font-extrabold text-white">{stats?.accuracy || "0"}%</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 text-fuchsia-400">
                <BarChart3 className="w-5 h-5" />
                <h2 className="font-bold">Tests Taken</h2>
              </div>
              <p className="text-4xl font-extrabold text-white">{stats?.testsTaken || "0"}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 text-blue-400">
                <TrendingUp className="w-5 h-5" />
                <h2 className="font-bold">Data Status</h2>
              </div>
              <p className="text-xl font-bold text-white">Active & Syncing</p>
            </motion.div>

          </div>
        )}
      </div>
    </div>
  );
}