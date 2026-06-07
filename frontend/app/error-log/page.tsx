"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { SkeletonRow } from "@/components/ui/Skeleton";

// C-02 FIX: Added strict TypeScript interface
interface ErrorLogEntry {
  id: number;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  explanation: string;
  date_added: string;
}

const PAGE_SIZE = 10;

export default function ErrorLogPage() {
  // C-02 FIX: Swapped any[] for ErrorLogEntry[]
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(0);

  // C-01 FIX: Clean fetch logic with secure cookies
  const fetchErrorLog = useCallback(async () => {
    setFetchError(false);
    setAuthError(false);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/error-log`, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        setAuthError(true);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setErrors(data);
        setPage(0);
        setAuthError(false);
        return;
      }

      setFetchError(true);
    } catch (error) {
      console.error("Error fetching error log:", error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchErrorLog();
    });
  }, [fetchErrorLog]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 md:p-12 relative z-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Mistake Locker
          </h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
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
        ) : fetchError ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Failed to load mistakes</h2>
            <p className="text-zinc-500 mb-6">Check your connection and try again.</p>
            <button
              onClick={fetchErrorLog}
              className="px-6 py-2 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors">
              Retry
            </button>
          </motion.div>
        ) : errors.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 shadow-xl backdrop-blur-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your locker is empty!</h2>
              <p className="text-zinc-500">You haven&apos;t made any mistakes yet. Keep taking mock tests!</p>
            </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-wider text-sm">Review Your Mistakes</h2>
            </div>
            
            {/* C-02 FIX: The new detailed rendering block */}
            <div className="space-y-4">
              {errors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((err, idx) => (
                <div key={err.id ?? idx} className="p-5 bg-zinc-950/50 border border-white/5 rounded-xl space-y-3">
                  <p className="text-base font-medium text-white">{err.question_text}</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-rose-400">
                      Your answer: <span className="font-semibold">{err.user_answer}</span>
                    </span>
                    <span className="text-emerald-400">
                      Correct answer: <span className="font-semibold">{err.correct_answer}</span>
                    </span>
                  </div>
                  {err.explanation && (
                    <p className="text-sm text-zinc-400 border-t border-white/5 pt-3">{err.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            {errors.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-zinc-500 text-sm">
                  Page {page + 1} of {Math.ceil(errors.length / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(errors.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={(page + 1) * PAGE_SIZE >= errors.length}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
            
          </motion.div>
        )}
      </div>
    </div>
  );
}
