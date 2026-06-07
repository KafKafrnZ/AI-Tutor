"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, X, Target } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { API_URL } from "@/lib/api" // H-02 FIX: Import API_URL
import { buildFallbackMockQuestions, getFallbackMockTest } from "@/lib/mockFallback"

interface Question {
  id: number
  question_text: string
  options: string[]
  correct_answer: string   // normalized "A" | "B" | "C" | "D"
  correct_answer_text: string
  explanation: string
  subject: string
  source?: string
}

interface TestDetails {
  id: number
  title: string
  duration_minutes: number
  questions: Question[]
  is_fallback?: boolean
  source?: string
}

interface ApiQuestion {
  id: number
  question: string
  options?: string[]
  correct_answer?: string
  correct_answer_text?: string
  explanation?: string
  section?: string
  topic?: string
  source?: string
}

interface MockTestPayload {
  test?: Partial<Pick<TestDetails, "id" | "title" | "duration_minutes" | "is_fallback" | "source">>
  questions?: ApiQuestion[]
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const

function normalizeCorrectOption(correctAnswer: string | undefined, options: string[]): string {
  const answer = (correctAnswer || "").trim()
  if (!answer) return ""

  const normalized = answer.toUpperCase().replace("OPTION", "").replace(/[.):-]/g, "").trim()
  if (OPTION_KEYS.includes(normalized as (typeof OPTION_KEYS)[number])) {
    return normalized
  }

  const leadingLetter = answer.match(/^([A-D])[\s.):-]/i)
  if (leadingLetter) {
    return leadingLetter[1].toUpperCase()
  }

  const answerLower = answer.toLowerCase()
  const matchedIndex = options.findIndex((option) => option.trim().toLowerCase() === answerLower)
  return matchedIndex >= 0 ? OPTION_KEYS[matchedIndex] : ""
}

function optionTextFor(correctOption: string, options: string[]): string {
  const index = OPTION_KEYS.findIndex((key) => key === correctOption)
  return index >= 0 ? options[index] : correctOption
}

function localFallbackPayload(testId: number): MockTestPayload {
  const fallbackTest = getFallbackMockTest(testId)
  return {
    test: {
      id: fallbackTest.id,
      title: fallbackTest.title,
      duration_minutes: fallbackTest.duration_minutes,
      is_fallback: true,
      source: fallbackTest.source,
    },
    questions: buildFallbackMockQuestions(testId),
  }
}

export default function MockTestEnginePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  
  const [test, setTest] = useState<TestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadNotice, setLoadNotice] = useState("")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({}) // { questionId: "A" }
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [isGridOpen, setIsGridOpen] = useState(false)

  // CRITICAL FIX FOR BUG-3: Use a mutable ref to always keep track of the latest user answers.
  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Fetch Mock Test Data
  useEffect(() => {
    async function fetchTest() {
      const numericId = Number(id) || 1
      let data: MockTestPayload

      try {
        // H-02 FIX: Target the correct sub-route with environment variable interpolation
        const res = await fetch(`${API_URL}/mock-tests/${id}/questions`, {
          credentials: "include"
        })
        if (!res.ok) throw new Error(`Failed to fetch test data: ${res.status}`)
        data = (await res.json()) as MockTestPayload

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          data = localFallbackPayload(numericId)
          setLoadNotice("No seeded questions were found for this set, so generated starter questions are loaded.")
        } else if (data.test?.is_fallback || data.test?.source?.includes("fallback")) {
          setLoadNotice("Generated starter questions are loaded because this mock has not been seeded yet.")
        } else {
          setLoadNotice("")
        }
      } catch (err) {
        console.error(err)
        data = localFallbackPayload(numericId)
        setLoadNotice("Backend mock questions are unavailable, so local starter questions are loaded.")
      }

      try {
        const meta = data.test || {}
        // H-02 FIX: Construct data schema mapping object transformation layer
        const mappedQuestions: Question[] = (data.questions || []).map((q) => {
          const apiOptions = (q.options || []).slice(0, 4)
          while (apiOptions.length < 4) apiOptions.push("")
          const letter = normalizeCorrectOption(
            q.correct_answer || q.correct_answer_text,
            apiOptions
          )
          return {
            id: q.id,
            question_text: q.question,
            options: apiOptions,
            correct_answer: letter || "A",
            correct_answer_text:
              q.correct_answer_text ||
              optionTextFor(letter, apiOptions) ||
              apiOptions[0] || "",
            explanation: q.explanation || "",
            subject: q.section || "General",
            source: q.source,
          }
        })

        const durMin = meta.duration_minutes || 90
        setTest({
          id: numericId,
          title: meta.title || `Mock Test Set ${id}`,
          duration_minutes: durMin,
          questions: mappedQuestions,
          is_fallback: meta.is_fallback,
          source: meta.source,
        })
        setTimeLeft(durMin * 60)
      } catch (err) {
        console.error("Failed to map mock test payload", err)
        setTest(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTest()
  }, [id])

  // Handle selecting an answer choice

  // Execute the actual submission
  const executeSubmit = useCallback(async (isAutoSubmit = false) => {
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

      if (userAnswer === q.correct_answer) {
        correctCount++
      } else {
        mistakesToLog.push({
          question_text: q.question_text,
          user_answer: userAnswer,
          correct_answer: q.correct_answer_text || optionTextFor(q.correct_answer, q.options || []),
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
      setShowSubmitModal(false)
    }
  }, [isSubmitting, router, test, timeLeft])

  // Initial Submit Check
  const handleFinalSubmit = useCallback((isAutoSubmit = false) => {
    if (isSubmitting || !test) return
    
    if (isAutoSubmit) {
      toast.error("Time is up! Your answers have been automatically submitted.")
      executeSubmit(true)
    } else {
      setShowSubmitModal(true)
    }
  }, [executeSubmit, isSubmitting, test])

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
  }, [handleFinalSubmit, isSubmitting, loading, timeLeft])

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-zinc-400 font-medium">
        Loading exam terminal resources...
      </div>
    )
  }

  if (!test || test.questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center font-medium">
        <p className="text-rose-400">Exam layout not found or contains no questions.</p>
        <button
          onClick={() => router.push("/mock-tests")}
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white hover:text-black"
        >
          Return to Mock Tests
        </button>
      </div>
    )
  }

  const currentQuestion = test.questions[currentIdx]

  return (
    <div className="min-h-screen bg-bg text-white p-6 md:p-12 relative">
      
      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowSubmitModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold mb-4">Submit Exam?</h2>
              <p className="text-zinc-400 mb-8">
                You have answered {Object.keys(answers).length} out of {test.questions.length} questions.
                Are you sure you want to submit? You cannot undo this action.
              </p>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setShowSubmitModal(false)} className="px-5 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors font-medium">
                  Review Answers
                </button>
                <button 
                  onClick={() => {
                    setIsSubmitting(true);
                    executeSubmit(false);
                  }} 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  {isSubmitting ? "Submitting..." : "Yes, Submit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/60 border border-white/5 rounded-2xl p-6 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{test.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Question {currentIdx + 1} of {test.questions.length}
            </p>
          </div>
          
          <div className="flex flex-col gap-3 self-stretch sm:self-auto sm:items-end">
            {timeLeft <= 300 && timeLeft > 0 && (
              <div aria-live="polite" className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-semibold px-4 py-2 rounded-xl animate-pulse text-center">
                <AlertTriangle className="mr-2 inline h-4 w-4 align-[-2px]" />
                {Math.ceil(timeLeft / 60)} min remaining - submit soon!
              </div>
            )}
            <div className="flex items-center gap-6 justify-between sm:justify-end">
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
        </div>

        {loadNotice && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadNotice}</span>
          </div>
        )}

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
                  {(currentQuestion.options || []).map((val, idx) => {
                    const key = OPTION_KEYS[idx] || String.fromCharCode(65 + idx)
                    const isSelected = answers[currentQuestion.id] === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectOption(currentQuestion.id, key)}
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
                            {key}
                          </span>
                          {val}
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

          {/* Quick Question Navigator Grid Sidebar - Desktop / Bottom Sheet - Mobile */}
          
          {/* Mobile Overlay & Toggle */}
          <AnimatePresence>
            {isGridOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsGridOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
            )}
          </AnimatePresence>

          <motion.div 
            className={`
              bg-zinc-900/95 border border-white/5 rounded-t-3xl lg:rounded-3xl p-6 flex flex-col gap-4 shadow-2xl
              fixed lg:static inset-x-0 bottom-0 z-50 transition-transform duration-300
              ${isGridOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}
          >
            <div className="flex justify-between items-center lg:mb-0">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Exam Overview
              </h3>
              <button onClick={() => setIsGridOpen(false)} className="lg:hidden text-zinc-400 hover:text-white p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </div>
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
          </motion.div>

          {/* Mobile Floating Toggle Button */}
          <button
            onClick={() => setIsGridOpen(true)}
            className={`
              lg:hidden fixed bottom-20 right-6 z-30 p-4 rounded-full shadow-2xl bg-zinc-800 text-white border border-white/10
              flex items-center gap-2 transition-transform
              ${isGridOpen ? 'scale-0' : 'scale-100'}
            `}
          >
            <Target className="w-5 h-5" />
            <span className="text-sm font-bold">{currentIdx + 1} / {test.questions.length}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
