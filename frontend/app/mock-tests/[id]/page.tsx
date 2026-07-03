"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, X, Target, CheckCircle2, XCircle } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

interface ExamQuestion {
  id: number
  question_text: string
  options: string[]
  subject: string
  difficulty: string
}

interface SubmitResultItem {
  id: number
  question?: string
  question_text?: string
  options: string[]
  correct_answer: string
  correct_answer_text: string
  explanation: string
  user_selected: string | null
  is_correct: boolean
  marks_awarded: number
  section?: string
}

interface SubmitResponse {
  score: number
  total: number
  percentage: number
  negative_marks_applied: boolean
  correct: number
  attempted: number
  results: SubmitResultItem[]
}

interface TestDetails {
  id: number
  title: string
  duration_minutes: number
  questions: ExamQuestion[]
  is_fallback?: boolean
  source?: string
}

interface ApiQuestion {
  id: number
  question?: string
  question_text?: string
  options?: string[]
  section?: string
  subject?: string
  topic?: string
  difficulty?: string
  source?: string
}

interface MockTestPayload {
  test?: Partial<Pick<TestDetails, "id" | "title" | "duration_minutes" | "is_fallback" | "source">> & {
    session_id?: string
  }
  questions?: ApiQuestion[]
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const

export default function MockTestEnginePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [test, setTest] = useState<TestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadNotice, setLoadNotice] = useState("")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [isGridOpen, setIsGridOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [submitResults, setSubmitResults] = useState<SubmitResponse | null>(null)

  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    async function fetchTest() {
      const numericId = Number(id) || 1
      try {
        const res = await fetch(`${API_URL}/mock-tests/${id}/questions`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error(`Failed to fetch test data: ${res.status}`)
        const data = (await res.json()) as MockTestPayload

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("No questions returned")
        }

        if (data.test?.is_fallback || data.test?.source?.includes("fallback")) {
          setLoadNotice("Generated starter questions are loaded because this bonfire trial has not been seeded yet.")
        } else {
          setLoadNotice("")
        }

        const meta = data.test || {}
        const mappedQuestions: ExamQuestion[] = (data.questions || []).map((q) => {
          const apiOptions = (q.options || []).slice(0, 4)
          while (apiOptions.length < 4) apiOptions.push("")
          return {
            id: q.id,
            question_text: q.question_text || q.question || "",
            options: apiOptions,
            subject: q.subject || q.section || q.topic || "General",
            difficulty: q.difficulty || "Medium",
          }
        })

        const durMin = meta.duration_minutes || 90
        if (meta.session_id) setSessionId(meta.session_id)
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
        console.error(err)
        toast.error("Could not load mock test. Please try again from the mock tests list.")
        setTest(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTest()
  }, [id])

  const executeSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (!test || !sessionId) {
        toast.error("Bonfire session is missing. Please reload and kindle a new trial.")
        return
      }

      setIsSubmitting(true)
      const finalAnswers = answersRef.current
      const collectedAnswers = test.questions.map((q) => ({
        question_id: q.id,
        selected: finalAnswers[q.id] ?? null,
      }))

      try {
        const res = await fetch(`/api/mock-tests/${test.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            session_id: sessionId,
            answers: collectedAnswers,
            time_taken: test.duration_minutes * 60 - timeLeft,
          }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          const code = errBody?.error?.code
          const message = errBody?.error?.message ?? errBody?.detail
          if (code === "SESSION_EXPIRED") {
            toast.error("The curse consumed the timer; results could not be saved.")
            router.push("/mock-tests")
            return
          }
          if (code === "SESSION_NOT_FOUND") {
            toast.error("Invalid bonfire session. Please start a new trial.")
            router.push("/mock-tests")
            return
          }
          toast.error(message ?? "Failed to submit test")
          return
        }

        const data = (await res.json()) as SubmitResponse
        setSubmitResults(data)
        if (isAutoSubmit) {
          toast.error("The curse reached full strength. Your answers were submitted.")
        } else {
          toast.success(`Trial complete - score ${data.score}/${data.total} (${data.percentage}%)`)
        }
      } catch (err) {
        console.error("Failed to submit test results:", err)
        toast.error("Network error. Please check your connection and try again.")
      } finally {
        setIsSubmitting(false)
        setShowSubmitModal(false)
      }
    },
    [router, sessionId, test, timeLeft]
  )

  const handleFinalSubmit = useCallback(
    (isAutoSubmit = false) => {
      if (isSubmitting || !test) return
      if (isAutoSubmit) {
        void executeSubmit(true)
      } else {
        setShowSubmitModal(true)
      }
    },
    [executeSubmit, isSubmitting, test]
  )

  useEffect(() => {
    if (loading || timeLeft <= 0 || isSubmitting || submitResults) return

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
  }, [handleFinalSubmit, isSubmitting, loading, submitResults, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-zinc-400 font-medium">
        Kindling bonfire resources...
      </div>
    )
  }

  if (!test || test.questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center font-medium">
        <p className="text-accent-mock">This trial was lost in the fog or contains no questions.</p>
        <button
          onClick={() => router.push("/mock-tests")}
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white hover:text-black"
        >
          Return to Bonfires
        </button>
      </div>
    )
  }

  if (submitResults) {
    const wrongCount = Math.max(0, submitResults.attempted - submitResults.correct)
    const skippedCount = Math.max(0, submitResults.total - submitResults.attempted)

    return (
      <div className="min-h-screen bg-bg text-white p-6 md:p-12 relative overflow-hidden">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-mock">Post-Mortem of Cinders</p>
            <h1 className="text-2xl font-bold">{test.title} - Trial Results</h1>
            <p className="text-zinc-400 mt-2">
              Correct: <span className="text-accent-progress">{submitResults.correct}</span> | Wrong:{" "}
              <span className="text-accent-mock">{wrongCount}</span> | Skipped:{" "}
              <span className="text-zinc-400">{skippedCount}</span>
            </p>
            <p className="text-zinc-400 mt-2">
              Score: <span className="text-accent-mock font-mono">{submitResults.score}</span> / {submitResults.total} ({submitResults.percentage}%)
            </p>
            <p className="text-xs text-accent-practice mt-1">Hollowing applied: -0.25 per wrong answer</p>
          </div>

          <div className="flex flex-col gap-4">
            {submitResults.results.map((item, idx) => {
              const optionIndex = item.user_selected
                ? OPTION_KEYS.indexOf(item.user_selected as (typeof OPTION_KEYS)[number])
                : -1
              const selectedText =
                optionIndex >= 0 && item.options[optionIndex]
                  ? `${item.user_selected}. ${item.options[optionIndex]}`
                  : item.user_selected || "Skipped"
              const questionText = item.question_text || item.question || ""
              const marksClass =
                item.marks_awarded > 0 ? "text-accent-progress" : item.marks_awarded < 0 ? "text-accent-mock" : "text-zinc-400"
              const selectedClass = item.is_correct ? "text-accent-progress" : item.user_selected ? "text-accent-mock" : "text-zinc-400"

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 ${
                    item.is_correct
                      ? "border-accent-progress/30 bg-accent-progress/5"
                      : item.user_selected
                      ? "border-accent-mock/30 bg-accent-mock/5"
                      : "border-white/10 bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-progress shrink-0 mt-0.5" />
                    ) : item.user_selected ? (
                      <XCircle className="w-5 h-5 text-accent-mock shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-zinc-500 mb-1">Q{idx + 1}</p>
                      <p className="font-medium">{questionText}</p>
                      <p className={`text-sm mt-2 ${selectedClass}`}>Chosen stance: {selectedText}</p>
                      <p className="text-sm text-accent-progress mt-1">
                        True stance: {item.correct_answer}. {item.correct_answer_text}
                      </p>
                      <p className={`text-sm font-semibold mt-1 ${marksClass}`}>
                        Souls awarded: {item.marks_awarded > 0 ? "+" : ""}{item.marks_awarded}
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">{item.explanation}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => router.push("/progress")}
            className="self-center px-6 py-3 rounded-xl bg-accent-mock hover:bg-accent-mock font-semibold transition-colors"
          >
            Open Command Center
          </button>
        </div>
      </div>
    )
  }


  const currentQuestion = test.questions[currentIdx]

  return (
    <div className="min-h-screen bg-bg text-white p-6 md:p-12 relative">
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowSubmitModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold mb-4">Enter the Fog?</h2>
              <p className="text-zinc-400 mb-8">
                You have answered {Object.keys(answers).length} out of {test.questions.length} questions.
                Once you enter the fog, this trial becomes a post-mortem.
              </p>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setShowSubmitModal(false)} className="px-5 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors font-medium">
                  Return to Bonfire
                </button>
                <button
                  onClick={() => void executeSubmit(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-accent-mock hover:bg-accent-mock text-white font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  {isSubmitting ? "Crossing..." : "Submit Trial"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/60 border border-white/5 rounded-2xl p-6 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{test.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Fog gate {currentIdx + 1} of {test.questions.length}
            </p>
          </div>

          <div className="flex flex-col gap-3 self-stretch sm:self-auto sm:items-end">
            {timeLeft <= 300 && timeLeft > 0 && (
              <div aria-live="polite" className="bg-accent-mock/20 border border-accent-mock/40 text-accent-mock text-sm font-semibold px-4 py-2 rounded-xl animate-pulse text-center">
                <AlertTriangle className="mr-2 inline h-4 w-4 align-[-2px]" />
                {Math.ceil(timeLeft / 60)} min remaining - submit soon!
              </div>
            )}
            <div className="flex items-center gap-6 justify-between sm:justify-end">
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl font-mono text-lg text-accent-mock">
                <Clock className="w-5 h-5 text-accent-mock" />
                {formatTime(timeLeft)}
              </div>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-mock hover:bg-accent-mock disabled:bg-zinc-800 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-accent-mock/20"
              >
                <Send className="w-4 h-4" /> Finish Trial
              </button>
            </div>
          </div>
        </div>

        {loadNotice && (
          <div className="flex items-start gap-3 rounded-2xl border border-accent-practice/20 bg-accent-practice/10 px-4 py-3 text-sm text-accent-practice">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
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

                <div className="flex flex-col gap-3">
                  {(currentQuestion.options || []).map((val, idx) => {
                    const key = OPTION_KEYS[idx] || String.fromCharCode(65 + idx)
                    const isSelected = answers[currentQuestion.id] === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, key)}
                        aria-pressed={isSelected}
                        className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-all flex items-center justify-between group ${
                          isSelected
                            ? "bg-accent-mock/10 border-accent-mock text-accent-mock font-medium"
                            : "bg-zinc-950/50 border-white/5 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <span className="flex gap-4 items-center">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs border font-bold ${
                              isSelected ? "bg-accent-mock border-transparent text-white" : "bg-zinc-900 border-white/10 text-zinc-400"
                            }`}
                          >
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

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() =>
                  setAnswers((prev) => {
                    const updated = { ...prev }
                    delete updated[currentQuestion.id]
                    return updated
                  })
                }
                className="text-xs text-zinc-500 hover:text-accent-mock transition-colors underline underline-offset-4"
              >
                Clear Stance
              </button>
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(test.questions.length - 1, prev + 1))}
                disabled={currentIdx === test.questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-white/5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isGridOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsGridOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
            )}
          </AnimatePresence>

          <motion.div
            className={`
              bg-zinc-900/95 border border-white/5 rounded-t-3xl lg:rounded-3xl p-6 flex flex-col gap-4 shadow-2xl
              fixed lg:static inset-x-0 bottom-0 z-50 transition-transform duration-300
              ${isGridOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"}
            `}
          >
            <div className="flex justify-between items-center lg:mb-0">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Exam Overview</h3>
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
                        ? "bg-white text-black border-transparent shadow-lg scale-105"
                        : isAnswered
                        ? "bg-accent-mock/20 border-accent-mock/40 text-accent-mock"
                        : "bg-zinc-950 border-white/5 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </button>
                )
              })}
            </div>
          </motion.div>

          <button
            onClick={() => setIsGridOpen(true)}
            className={`lg:hidden fixed bottom-20 right-6 z-30 p-4 rounded-full shadow-2xl bg-zinc-800 text-white border border-white/10 flex items-center gap-2 ${
              isGridOpen ? "scale-0" : "scale-100"
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-sm font-bold">
              {currentIdx + 1} / {test.questions.length}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
