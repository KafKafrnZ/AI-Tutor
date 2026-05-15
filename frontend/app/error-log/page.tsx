"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Brain } from "lucide-react";

export default function ErrorLogPage() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://127.0.0.1:8000/error-log", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setErrors(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchErrors();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <Link href="/progress" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Back to Progress</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,113,0.15)]">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Mistake Locker</h1>
              <p className="text-zinc-400 mt-1">Review your incorrect answers and learn from them.</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-zinc-500 mt-20 animate-pulse">Loading your history...</div>
          ) : errors.length === 0 ? (
            <div className="text-center mt-20 bg-zinc-900/50 border border-white/5 p-10 rounded-3xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No mistakes found!</h2>
              <p className="text-zinc-400">Take a mock test. Any questions you get wrong will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {errors.map((err, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={err.id} 
                  className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl"
                >
                  <p className="text-lg text-white font-medium leading-relaxed mb-6">{err.question_text}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-rose-500/70 uppercase tracking-wider block mb-1">You Answered</span>
                        <span className="text-rose-200 font-medium">{err.user_answer || "Skipped"}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-emerald-500/70 uppercase tracking-wider block mb-1">Correct Answer</span>
                        <span className="text-emerald-200 font-medium">{err.correct_answer}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-white/5 flex gap-3 items-start">
                    <Brain className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300 leading-relaxed"><span className="font-bold text-violet-400">Explanation:</span> {err.explanation}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}