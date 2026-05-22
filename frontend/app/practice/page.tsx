"use client";

import { useState } from 'react';
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Target, Sparkles } from 'lucide-react';
import { useAppStore } from "@/store/useAppStore";
import BlackholeBackground from "@/components/ui/Blackhole";

export default function PracticePage() {
  // GLOBAL STATE
  const { 
    practiceTopic: topic, 
    setPracticeTopic: setTopic,
    practiceQuestions: questions, 
    setPracticeQuestions: setQuestions,
    practiceAnswers: selectedAnswers, 
    setPracticeAnswers: setSelectedAnswers 
  } = useAppStore();

  // LOCAL STATE
  const [loading, setLoading] = useState(false);

  const generateQuestions = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    setQuestions([]);
    setSelectedAnswers({});

    try {
      const token = localStorage.getItem('token');
      
      const enhancedTopic = `${topic}. Generate exactly 30 questions for this topic.`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://ai-tutor-production-43fe.up.railway.app";
      const res = await fetch(`${apiUrl}/practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: enhancedTopic }),
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();

      let parsedQuestions = [];
      if (Array.isArray(data.answer)) {
        parsedQuestions = data.answer;
      } else if (typeof data.answer === 'string') {
        try {
          parsedQuestions = JSON.parse(data.answer);
        } catch {
          parsedQuestions = [{ difficulty: "Medium", question: data.answer, options: [], correct_answer: "", explanation: "" }];
        }
      } else if (Array.isArray(data.questions)) {
        parsedQuestions = data.questions;
      }

      if (parsedQuestions.length > 0) {
        setQuestions(parsedQuestions);
        toast.success(`Generated ${parsedQuestions.length} questions for "${topic}"`);
      } else {
        toast.error("No questions generated. Try a more specific topic.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Backend not reachable. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex: number, option: string) => {
    const currentAnswers = useAppStore.getState().practiceAnswers;
    if (currentAnswers[questionIndex]) return; 
    
    // Safely append to the global state dict
    setSelectedAnswers({ ...currentAnswers, [questionIndex]: option });
  };

  const getDifficultyHue = (difficulty: string) => {
    const diff = difficulty?.toLowerCase() || 'medium';
    if (diff === 'easy') return "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]";
    if (diff === 'hard') return "border-rose-500/30 shadow-[0_0_30px_rgba(244,63,113,0.1)]";
    return "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]";
  };

  const getBadgeStyle = (difficulty: string) => {
    const diff = difficulty?.toLowerCase() || 'medium';
    if (diff === 'easy') return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (diff === 'hard') return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  };

  return (
    // Changed to h-screen and transparent background
    <div className="h-screen flex flex-col bg-transparent relative overflow-hidden">
      
      {/* THE 3D BACKGROUND (Zoomed in heavily for the Practice Page) */}
      <BlackholeBackground scale={3.5} cameraPosition={[0, 0, 8]} opacity={0.7} />
      
      {/* --- TOP NAVIGATION BAR --- Transparent Gradient */}
      <div className="h-24 flex items-start pt-6 px-6 shrink-0 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 pointer-events-none">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors group pointer-events-auto">
          <div className="p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm drop-shadow-md">Dashboard</span>
        </Link>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-white/10 pt-24 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Header Area */}
          <div className="flex flex-col items-center text-center mb-12 mt-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/80 to-orange-600/80 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/20 mb-6">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3 drop-shadow-lg">Practice Arena</h1>
            <p className="text-zinc-300 max-w-lg drop-shadow-md">Generate targeted, adaptive mock questions on any IBPS SO topic to strengthen your weak areas.</p>
          </div>

          {/* Search Input (Now glassy) */}
          <div className="relative group max-w-2xl mx-auto mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-orange-600/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Database Normalization, OSI Model..."
                className="flex-1 bg-transparent text-lg text-white px-4 focus:outline-none placeholder:text-zinc-500"
                onKeyDown={(e) => e.key === 'Enter' && generateQuestions()}
              />
              <Button onClick={generateQuestions} disabled={loading} className="px-8 py-6 text-md bg-amber-500/90 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg backdrop-blur-md">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Generate</span>}
              </Button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-10">
            {questions.map((q, i) => {
              const isAnswered = !!selectedAnswers[i];
              const userSelectedOpt = selectedAnswers[i];

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.1, 1) }}
                  key={i} 
                  // Made the question card highly transparent (bg-black/20)
                  className={`p-8 bg-black/20 backdrop-blur-xl border rounded-3xl transition-all duration-500 relative overflow-hidden ${getDifficultyHue(q.difficulty)}`}
                >
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full border uppercase tracking-widest ${getBadgeStyle(q.difficulty)}`}>
                      {q.difficulty || 'Medium'}
                    </span>
                    <span className="text-sm font-semibold text-zinc-400 tracking-wider drop-shadow-md">QUESTION {i + 1} OF {questions.length}</span>
                  </div>

                  <p className="text-xl font-medium leading-relaxed mb-8 text-white relative z-10 drop-shadow-md">{q.question}</p>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 gap-3 relative z-10">
                    {Array.isArray(q.options) ? (
                      q.options.map((opt: string, idx: number) => {
                        const isCorrectAnswer = opt === q.correct_answer;
                        const isThisOptionSelected = userSelectedOpt === opt;
                        
                        // Default Glassy Option Style
                        let style = "bg-black/30 border-white/10 text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/10 cursor-pointer backdrop-blur-md";
                        
                        if (isAnswered) {
                          if (isCorrectAnswer) {
                            style = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md";
                          } else if (isThisOptionSelected && !isCorrectAnswer) {
                            style = "bg-rose-500/20 border-rose-500/50 text-rose-300 cursor-default backdrop-blur-md";
                          } else {
                            style = "bg-black/10 border-white/5 text-zinc-500 cursor-default opacity-50 backdrop-blur-sm";
                          }
                        }

                        return (
                          <div 
                            key={idx} onClick={() => handleOptionSelect(i, opt)}
                            className={`p-5 border rounded-2xl transition-all duration-300 flex justify-between items-center ${style}`}
                          >
                            <span className="font-medium drop-shadow-sm">{opt}</span>
                            {isAnswered && isCorrectAnswer && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 drop-shadow-md" />}
                            {isAnswered && isThisOptionSelected && !isCorrectAnswer && <XCircle className="w-6 h-6 text-rose-400 shrink-0 drop-shadow-md" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-300 text-sm">
                        ⚠️ The AI failed to format the options properly.
                      </div>
                    )}
                  </div>

                  {/* Explanation Block (Glassy) */}
                  {isAnswered && q.explanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="mt-8 pt-6 border-t border-white/10 relative z-10"
                    >
                      <p className="font-semibold text-amber-400 mb-3 text-lg flex items-center gap-2 drop-shadow-md">
                        💡 Explanation
                      </p>
                      <p className="text-zinc-200 leading-relaxed text-[15px] drop-shadow-sm">{q.explanation}</p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
          
        </div>
      </div>
    </div>
  );
}