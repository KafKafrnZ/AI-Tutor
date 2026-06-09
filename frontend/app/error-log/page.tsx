"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Bot, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { API_URL, fetchWithRefresh } from "@/lib/api";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

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
  const router = useRouter();
  const setPracticeTopic = useAppStore(state => state.setPracticeTopic);

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
      const response = await fetchWithRefresh(`${API_URL}/error-log`, {
        method: "GET",
      });

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
    <PageShell maxWidth="max-w-4xl" universe="hades">
      <PageHeader
        universe="hades"
        title="House of Mistakes"
        subtitle="Claim each shade, read the cause of death, and turn it into a boon."
        backHref="/dashboard"
        backLabel="Back to War Room"
      />

      {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : authError ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 shadow-xl backdrop-blur-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent-mock/10 text-accent-mock rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">The House Barred Entry</h2>
              <p className="text-zinc-500 mb-6">Your session has expired or is invalid.</p>
              <Link href="/login" className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors">
                 Log In Again
              </Link>
            </motion.div>
        ) : fetchError ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-accent-mock mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">The shade ledger would not open</h2>
            <p className="text-zinc-500 mb-6">Check your connection and summon the ledger again.</p>
            <button
              onClick={fetchErrorLog}
              className="px-6 py-2 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors">
              Retry
            </button>
          </motion.div>
        ) : errors.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 shadow-xl backdrop-blur-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent-progress/10 text-accent-progress rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No shades haunt this hall.</h2>
              <p className="text-zinc-500">No mistakes recorded yet. Enter a trial and the House will keep score.</p>
            </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 text-accent-mock">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-wider text-sm">Claim Your Shades</h2>
            </div>

            {/* C-02 FIX: The new detailed rendering block */}
            <div className="space-y-4">
              {errors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((err, idx) => (
                <div key={err.id ?? idx} className="p-5 bg-zinc-950/50 border border-white/5 rounded-xl space-y-3">
                  <p className="text-base font-medium text-white">{err.question_text}</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-accent-mock">
                      Fallen answer: <span className="font-semibold">{err.user_answer}</span>
                    </span>
                    <span className="text-accent-progress">
                      Boon answer: <span className="font-semibold">{err.correct_answer}</span>
                    </span>
                  </div>
                  {err.explanation && (
                    <p className="text-sm text-zinc-400 border-t border-white/5 pt-3">{err.explanation}</p>
                  )}
                  <div className="flex gap-3 pt-3 border-t border-white/5 mt-2">
                    <button
                      onClick={() => router.push(`/tutor?q=${encodeURIComponent(`Explain the answer to this question: ${err.question_text}`)}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-xs font-medium transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" /> Ask Oracle
                    </button>
                    <button
                      onClick={() => {
                        setPracticeTopic(err.question_text.slice(0, 50) + "...");
                        router.push("/practice");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-practice/10 hover:bg-accent-practice/20 text-accent-practice rounded-lg text-xs font-medium transition-colors"
                    >
                      <Target className="w-3.5 h-3.5" /> Enter Arena
                    </button>
                  </div>
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
      </PageShell>
  );
}
