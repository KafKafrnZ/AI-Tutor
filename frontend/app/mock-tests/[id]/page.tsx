"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { use } from "react"; // Required for unwrapping Next.js params in Next 15+

export default function ExamEnginePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap the params promise (Next.js 15+ standard)
  const resolvedParams = use(params);
  const testId = resolvedParams.id;
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(7200); // 120 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FETCH REAL QUESTIONS FROM DATABASE ---
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://127.0.0.1:8000/mock-tests/${testId}/questions`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions);
        } else {
          toast.error("Failed to load test questions.");
        }
      } catch (e) {
        console.error(e);
        toast.error("Network error loading questions.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [testId]);

  // Timer Logic
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentIndex];
    setAnswers(newAnswers);
  };

  const handleMarkForReview = () => {
    setMarkedForReview(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  // --- THE MASTER SUBMISSION LOGIC ---
  const submitExam = async () => {
    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    let correctCount = 0;
    let attemptedCount = Object.keys(answers).length;
    let wrongAnswers: any[] = [];

    // 1. Grade the exam & collect wrong answers
    questions.forEach((q, index) => {
      const userAns = answers[index] || "";
      if (userAns === q.correct_answer) {
        correctCount++;
      } else {
        // Log it if they got it wrong OR skipped it
        wrongAnswers.push({
          question_text: q.question,
          user_answer: userAns, // Will be empty string if skipped
          correct_answer: q.correct_answer,
          explanation: q.explanation || "No explanation provided."
        });
      }
    });

    const timeTakenInSeconds = 7200 - timeLeft;
    const timeTakenInMins = parseFloat((timeTakenInSeconds / 60).toFixed(2));

    try {
      // 2. Save the Overall Score
      const scorePayload = {
        date: new Date().toISOString().split('T')[0],
        test_name: `IBPS SO 2025 Mock - Set ${testId}`, 
        section: "Overall",
        attempted: attemptedCount,
        correct: correctCount,
        time_taken: timeTakenInMins
      };

      await fetch("http://127.0.0.1:8000/save-mock-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(scorePayload)
      });

      // 3. Save the Mistakes to the Error Log
      if (wrongAnswers.length > 0) {
        await fetch("http://127.0.0.1:8000/save-errors", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ errors: wrongAnswers })
        });
      }

      toast.success(`Exam Submitted! You scored ${correctCount} out of ${questions.length}.`);
      router.push("/progress");
      
    } catch (err) {
      console.error(err);
      toast.error("Network error. Ensure FastAPI is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (index: number) => {
    if (markedForReview[index]) return "bg-violet-600 border-violet-500 text-white";
    if (answers[index]) return "bg-emerald-500 border-emerald-400 text-white";
    if (index === currentIndex) return "bg-zinc-700 border-zinc-500 text-white";
    return "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800";
  };

  // Loading State
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#09090b]">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">Loading Secure Exam Environment...</h2>
      </div>
    );
  }

  // Safety catch if no questions exist
  if (questions.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-rose-500 mb-2">Test Not Found</h2>
          <p className="text-zinc-400">No questions exist for this test yet. Please run the database seeder.</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden text-zinc-200">
      
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="font-bold text-lg tracking-wide uppercase">IBPS SO <span className="text-rose-500">MOCK SET {testId}</span></div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg border transition-colors ${timeLeft < 300 ? 'bg-rose-500/20 text-rose-500 border-rose-500/50 animate-pulse' : 'bg-zinc-900 text-emerald-400 border-zinc-800'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={submitExam} 
            disabled={isSubmitting}
            className="bg-white text-black font-bold px-6 py-2 rounded-full hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Exam"}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col h-full relative z-10 bg-zinc-900/20 backdrop-blur-sm">
          {/* Section Tabs */}
          <div className="flex border-b border-white/5 bg-zinc-950/50">
            {["Reasoning", "Quant", "English & IT"].map((sec) => (
              <button key={sec} className={`px-6 py-4 font-medium text-sm border-r border-white/5 transition-all ${currentQ.section === sec ? 'bg-zinc-800 text-white border-b-2 border-b-rose-500 shadow-[inset_0_-2px_10px_rgba(244,63,113,0.1)]' : 'text-zinc-500 hover:bg-zinc-800/50'}`}>
                {sec}
              </button>
            ))}
          </div>

          {/* Question Box */}
          <div className="flex-1 overflow-y-auto p-10">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-white">Question {currentIndex + 1}</h2>
                <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">{currentQ.section}</span>
              </div>
              
              <div className="text-xl leading-relaxed mb-10 text-zinc-300 font-medium whitespace-pre-wrap">
                {currentQ.question}
              </div>

              <div className="space-y-4">
                {currentQ.options.map((opt: string, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectOption(opt)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${answers[currentIndex] === opt ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${answers[currentIndex] === opt ? 'border-emerald-500 bg-emerald-500/20' : 'border-zinc-600'}`}>
                      {answers[currentIndex] === opt && <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}
                    </div>
                    <span className="font-medium text-[15px]">{opt}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-white/10 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex gap-3">
              <button onClick={handleMarkForReview} className="px-6 py-3 rounded-xl border border-violet-500/50 text-violet-400 font-medium hover:bg-violet-500/10 hover:border-violet-500 transition-all shadow-sm">
                Mark for Review & Next
              </button>
              <button onClick={handleClearResponse} className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 font-medium hover:bg-zinc-800 hover:text-white transition-all shadow-sm">
                Clear Response
              </button>
            </div>
            
            <button onClick={handleSaveAndNext} className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95">
              Save & Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Navigation Palette */}
        <div className="w-80 border-l border-white/10 bg-zinc-950 flex flex-col h-full shrink-0 relative z-20">
          <div className="p-5 border-b border-white/5 bg-zinc-900/80">
            <h3 className="font-bold text-white mb-4 text-lg tracking-tight">Question Palette</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-zinc-400">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Answered</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900" /> Not Visited</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]" /> Marked</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-white bg-zinc-700" /> Current</div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, i) => (
                <button 
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-10 rounded-md border text-sm font-bold flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${getStatusColor(i)} ${i === currentIndex ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}