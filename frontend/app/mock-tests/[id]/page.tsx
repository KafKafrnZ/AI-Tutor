"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, CheckCircle } from "lucide-react"
import { API_URL } from "@/lib/api" // H-02 FIX: Import API_URL

interface Question {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
  subject: string
}

interface TestDetails {
  id: number
  title: string
  duration_minutes: number
  questions: Question[]
}

export default function MockTestEnginePage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [test, setTest] = useState<TestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({}) // { questionId: "A" }
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [isSubmitting, setIsSubmitting] = useState(false)

  // CRITICAL FIX FOR BUG-3: Use a mutable ref to always keep track of the latest user answers.
  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Fetch Mock Test Data
  useEffect(() => {
    async function fetchTest() {
      try {
        // H-02 FIX: Target the correct sub-route with environment variable interpolation
        const res = await fetch(`${API_URL}/mock-tests/${id}/questions`, {
          credentials: "include"
        })
        if (!res.ok) throw new Error("Failed to fetch test data")
        const data = await res.json()
        
        const meta = data.test || {}
        // H-02 FIX: Construct data schema mapping object transformation layer
        const mappedQuestions: Question[] = (data.questions || []).map((q: any) => ({
          id: q.id,
          question_text: q.question,
          option_a: q.options[0] || "",
          option_b: q.options[1] || "",
          option_c: q.options[2] || "",
          option_d: q.options[3] || "",
          correct_option: q.correct_answer,
          explanation: q.explanation || "",
          subject: q.section || "General"
        }))

        const durMin = meta.duration_minutes || 90
        setTest({
          id: Number(id),
          title: meta.title || `Mock Test Set ${id}`,
          duration_minutes: durMin,
          questions: mappedQuestions
        })
        setTimeLeft(durMin * 60)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTest()
  }, [id])

  // Countdown Timer Hook
  useEffect(() => {
    if (loading || timeLeft <= 0 || isSubmitting) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinalSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, isSubmitting])

  // Handle selecting an answer choice
  const handleSelectOption = (questionId: number, optionLetter: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionLetter
    }))
  }

  // Submit Logic
  const handleFinalSubmit = async (isAutoSubmit = false) => {
    if (isSubmitting || !test) return
    setIsSubmitting(true)

    if (isAutoSubmit) {
      alert("Time is up! Your answers are being automatically submitted.")
    } else if (!confirm("Are you sure you want to submit the exam?")) {
      setIsSubmitting(false)
      return
    }

    const finalAnswers = answersRef.current
    
    const mistakesToLog = []
    let correctCount = 0
    let skippedCount = 0

    // Evaluate answers
    for (const q of test.questions) {
      const userAnswer = finalAnswers[q.id]

      if (!userAnswer) {
        skippedCount++
        continue
      }

      if (userAnswer === q.correct_option) {
        correctCount++
      } else {
        mistakesToLog.push({
          question_text: q.question_text,
          user_answer: userAnswer,
          correct_answer: q.correct_option,
          explanation: q.explanation
        })
      }
    }

    try {
      // 1. Submit exam summary metrics to backend using environment dynamic URL
      await fetch(`${API_URL}/save-mock-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          test_name: test.title,
          section: "Full Mock",
          attempted: test.questions.length - skippedCount,
          correct: correctCount,
          time_taken: (test.duration_minutes * 60) - timeLeft
        })
      })

    // 2. Batch upload genuine incorrect answers to Mistake Locker with corrected parameter key
      if (mistakesToLog.length > 0) {
        await fetch(`${API_URL}/save-errors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ errors: mistakesToLog }) // Fixed: changed 'mistakes' to 'errors'
        })
      }

      router.push("/progress")
    } catch (err) {
      console.error("Failed to submit test results safely:", err)
      alert("An error occurred while saving your results. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-medium">
        Loading exam terminal resources...
      </div>
    )
  }

  if (!test || test.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-rose-400 font-medium">
        Exam layout not found or contains no questions. Return to index.
      </div>
    )
  }

  const currentQuestion = test.questions[currentIdx]

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/60 border border-white/5 rounded-2xl p-6 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{test.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Question {currentIdx + 1} of {test.questions.length}
            </p>
          </div>
          
          <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl font-mono text-lg text-pink-400">
              <Clock className="w-5 h-5 text-pink-500" />
              {formatTime(timeLeft)}
            </div>
            
            <button
              onClick={() => handleFinalSubmit(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-zinc-800 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-pink-950/20"
            >
              <Send className="w-4 h-4" /> Finish Exam
            </button>
          </div>
        </div>

        {/* Main Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Question Viewer Workspace */}
          <div className="lg:col-span-3 bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8 min-h-[400px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 bg-zinc-800 border border-white/5 rounded-md text-zinc-400">
                    {currentQuestion.subject}
                  </span>
                  <h2 className="text-lg md:text-xl font-medium mt-4 leading-relaxed">
                    {currentQuestion.question_text}
                  </h2>
                </div>

                {/* Answer Options Grid */}
                <div className="flex flex-col gap-3">
                  {[
                    { key: "A", val: currentQuestion.option_a },
                    { key: "B", val: currentQuestion.option_b },
                    { key: "C", val: currentQuestion.option_c },
                    { key: "D", val: currentQuestion.option_d }
                  ].map((opt) => {
                    const isSelected = answers[currentQuestion.id] === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectOption(currentQuestion.id, opt.key)}
                        className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-all flex items-center justify-between group ${
                          isSelected
                            ? "bg-pink-500/10 border-pink-500 text-pink-400 font-medium"
                            : "bg-zinc-950/50 border-white/5 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <span className="flex gap-4 items-center">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs border font-bold ${
                            isSelected ? "bg-pink-500 border-transparent text-white" : "bg-zinc-900 border-white/10 text-zinc-400"
                          }`}>
                            {opt.key}
                          </span>
                          {opt.val}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
              <button
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                onClick={() => setAnswers(prev => {
                  const updated = { ...prev }
                  delete updated[currentQuestion.id]
                  return updated
                })}
                className="text-xs text-zinc-500 hover:text-rose-400 transition-colors underline underline-offset-4"
              >
                Clear Answer Choice
              </button>

              <button
                onClick={() => setCurrentIdx(prev => Math.min(test.questions.length - 1, prev + 1))}
                disabled={currentIdx === test.questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Question Navigator Grid Sidebar */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Exam Overview
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {test.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = idx === currentIdx
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center ${
                      isCurrent
                        ? "bg-white text-black border-transparent shadow-lg shadow-white/10 scale-105"
                        : isAnswered
                        ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                        : "bg-zinc-950 border-white/5 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2 text-xs text-zinc-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-500/20 border border-pink-500/40" />
                <span>Attempted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-zinc-950 border border-white/5" />
                <span>Unattempted / Skipped</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}