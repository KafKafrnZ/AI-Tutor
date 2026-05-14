"use client";

import { useState } from 'react';
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, BookOpen, CheckCircle2, XCircle, ArrowLeft, Target, Sparkles } from 'lucide-react';

export default function PracticePage() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

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
      
      // We append a strict instruction to the topic so the backend LLM knows to generate 30 questions
      const enhancedTopic = `${topic}. Generate exactly 30 questions for this topic.`;

      const res = await fetch('http://127.0.0.1:8000/practice', {
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
    if (selectedAnswers[questionIndex]) return; 
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  // Helper functions for dynamic difficulty styling
  const getDifficultyHue = (difficulty: string) => {
    const diff = difficulty?.toLowerCase() || 'medium';
    if (diff === 'easy') return "border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]";
    if (diff === 'hard') return "border-rose-500/40 shadow-[0_0_30px_rgba(244,63,113,0.1)]";
    return "border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.1)]";
  };

  const getBadgeStyle = (difficulty: string) => {
    const diff = difficulty?.toLowerCase() || 'medium';
    if (diff === 'easy') return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (diff === 'hard') return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header Area */}
          <div className="flex flex-col items-center text-center mb-12 mt-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/20 mb-6">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Practice Arena</h1>
            <p className="text-zinc-400 max-w-lg">Generate targeted, adaptive mock questions on any IBPS SO topic to strengthen your weak areas.</p>
          </div>

          {/* Search Input */}
          <div className="relative group max-w-2xl mx-auto mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-orange-600/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Database Normalization, OSI Model..."
                className="flex-1 bg-transparent text-lg text-white px-4 focus:outline-none placeholder:text-zinc-600"
                onKeyDown={(e) => e.key === 'Enter' && generateQuestions()}
              />
              <Button onClick={generateQuestions} disabled={loading} className="px-8 py-6 text-md bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all">
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
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  key={i} 
                  className={`p-8 bg-zinc-900/50 backdrop-blur-sm border rounded-3xl transition-all duration-500 relative overflow-hidden ${getDifficultyHue(q.difficulty)}`}
                >
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full border uppercase tracking-widest ${getBadgeStyle(q.difficulty)}`}>
                      {q.difficulty || 'Medium'}
                    </span>
                    <span className="text-sm font-semibold text-zinc-500 tracking-wider">QUESTION {i + 1} OF {questions.length}</span>
                  </div>

                  <p className="text-xl font-medium leading-relaxed mb-8 text-white relative z-10">{q.question}</p>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 gap-3 relative z-10">
                    {Array.isArray(q.options) ? (
                      q.options.map((opt: string, idx: number) => {
                        const isCorrectAnswer = opt === q.correct_answer;
                        const isThisOptionSelected = userSelectedOpt === opt;
                        
                        let style = "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer";
                        
                        if (isAnswered) {
                          if (isCorrectAnswer) {
                            style = "bg-emerald-500/10 border-emerald-500 text-emerald-400 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                          } else if (isThisOptionSelected && !isCorrectAnswer) {
                            style = "bg-rose-500/10 border-rose-500 text-rose-400 cursor-default";
                          } else {
                            style = "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-default opacity-40";
                          }
                        }

                        return (
                          <div 
                            key={idx} onClick={() => handleOptionSelect(i, opt)}
                            className={`p-5 border rounded-2xl transition-all duration-300 flex justify-between items-center ${style}`}
                          >
                            <span className="font-medium">{opt}</span>
                            {isAnswered && isCorrectAnswer && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
                            {isAnswered && isThisOptionSelected && !isCorrectAnswer && <XCircle className="w-6 h-6 text-rose-500 shrink-0" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        ⚠️ The AI failed to format the options properly.
                      </div>
                    )}
                  </div>

                  {/* Explanation Block */}
                  {isAnswered && q.explanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="mt-8 pt-6 border-t border-white/10 relative z-10"
                    >
                      <p className="font-semibold text-amber-400 mb-3 text-lg flex items-center gap-2">
                        💡 Explanation
                      </p>
                      <p className="text-zinc-300 leading-relaxed text-[15px]">{q.explanation}</p>
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