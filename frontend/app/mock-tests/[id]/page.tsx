"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, X, Target, CheckCircle2, XCircle, Flame } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { API_URL, fetchWithRefresh } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  GameAtmosphere,
  GameButton,
  GameCard,
  GameLinkButton,
  GameStat,
  InWorldState,
  RouteLoading,
} from "@/components/game/GamePrimitives"

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
  const reduceMotion = useReducedMotion()

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
        const res = await fetchWithRefresh(`${API_URL}/mock-tests/${id}/questions`, {
          method: "GET",
        })
        if (res.status === 429) {
          toast.error("Daily plan limit reached. Try again tomorrow.")
          setTest(null)
          return
        }
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
        if (err instanceof Error && err.message === "SESSION_EXPIRED") return
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
        const res = await fetchWithRefresh(`/api/mock-tests/${test.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        if (err instanceof Error && err.message === "SESSION_EXPIRED") return
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
    return <RouteLoading universe="souls" title="Kindling the bonfire..." />
  }

  if (!test || test.questions.length === 0) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-bg p-6">
        <GameAtmosphere universe="souls" />
        <div className="relative z-10 mx-auto max-w-lg pt-16">
          <InWorldState
            universe="souls"
            title="This trial was lost in the fog"
            body="The bonfire has no questions, or the session could not be kindled. Return to the list and choose another gate."
            action={<GameLinkButton href="/mock-tests" universe="souls">Return to Bonfires</GameLinkButton>}
          />
        </div>
      </div>
    )
  }

  if (submitResults) {
    const wrongCount = Math.max(0, submitResults.attempted - submitResults.correct)
    const skippedCount = Math.max(0, submitResults.total - submitResults.attempted)
    const hollowed = submitResults.negative_marks_applied

    return (
      <div className="relative min-h-screen overflow-hidden bg-bg p-4 text-white md:p-10">
        <GameAtmosphere universe="souls" intensity="normal" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-6">
          <GameCard universe="souls" className="p-6 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-souls">Post-Mortem of Cinders</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">{test.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Trial closed. Read the cause of death, then take the souls that remain.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <GameStat universe="souls" label="Souls" value={`${submitResults.score} / ${submitResults.total}`} />
              <GameStat universe="command" label="Cleared" value={submitResults.correct} />
              <GameStat universe="hades" label="Hollowed" value={wrongCount} />
              <GameStat universe="neuro" label="Skipped" value={skippedCount} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono text-accent-souls">{submitResults.percentage}%</span>
              <span className="text-zinc-500">posture remaining</span>
              {hollowed && (
                <span className="rounded-full border border-accent-practice/30 bg-accent-practice/10 px-3 py-1 text-xs font-semibold text-accent-practice">
                  Hollowing applied: −0.25 per wrong answer
                </span>
              )}
            </div>
          </GameCard>

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
                <GameCard
                  key={item.id}
                  universe="souls"
                  className={cn(
                    "p-5",
                    item.is_correct
                      ? "border-accent-progress/30"
                      : item.user_selected
                      ? "border-accent-mock/30"
                      : "border-white/10"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {item.is_correct ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-progress" />
                    ) : item.user_selected ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-mock" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-sm text-zinc-500">Fog gate {idx + 1}</p>
                      <p className="font-medium">{questionText}</p>
                      <p className={`mt-2 text-sm ${selectedClass}`}>Chosen stance: {selectedText}</p>
                      <p className="mt-1 text-sm text-accent-progress">
                        True stance: {item.correct_answer}. {item.correct_answer_text}
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${marksClass}`}>
                        Souls awarded: {item.marks_awarded > 0 ? "+" : ""}{item.marks_awarded}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{item.explanation}</p>
                    </div>
                  </div>
                </GameCard>
              )
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pb-8">
            <GameLinkButton href="/mock-tests" universe="souls">
              Return to Bonfires
            </GameLinkButton>
            <GameButton type="button" universe="souls" onClick={() => router.push("/progress")}>
              Open Command Center
            </GameButton>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = test.questions[currentIdx]
  const answeredCount = Object.keys(answers).length
  const totalDuration = Math.max(1, test.duration_minutes * 60)
  const timeRatio = Math.max(0, Math.min(1, timeLeft / totalDuration))
  const critical = timeLeft <= 300 && timeLeft > 0
  const slide = reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white md:p-8">
      <GameAtmosphere universe="souls" intensity="quiet" />

      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            role="presentation"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="fog-gate-title"
              initial={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl border border-accent-souls/30 bg-surface/95 p-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-souls/50"
                aria-label="Close fog gate dialog"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-souls">Fog Gate</p>
              <h2 id="fog-gate-title" className="mt-2 text-2xl font-bold">Enter the Fog?</h2>
              <p className="mt-3 mb-8 text-zinc-400">
                You have answered {answeredCount} out of {test.questions.length} questions.
                Once you enter the fog, this trial becomes a post-mortem.
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <GameButton type="button" variant="ghost" universe="souls" onClick={() => setShowSubmitModal(false)}>
                  Return to Bonfire
                </GameButton>
                <GameButton
                  type="button"
                  variant="danger"
                  universe="souls"
                  onClick={() => void executeSubmit(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Crossing..." : "Submit Trial"}
                </GameButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5">
        <GameCard universe="souls" className="p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-accent-souls">Bonfire Simulation</p>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight">{test.title}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Fog gate {currentIdx + 1} of {test.questions.length} · {answeredCount} stances locked
              </p>
            </div>

            <div className="flex flex-col gap-3 self-stretch sm:items-end">
              {critical && (
                <div
                  aria-live="polite"
                  className={cn(
                    "rounded-xl border border-accent-mock/40 bg-accent-mock/20 px-4 py-2 text-center text-sm font-semibold text-accent-mock",
                    !reduceMotion && "animate-pulse"
                  )}
                >
                  <AlertTriangle className="mr-2 inline h-4 w-4 align-[-2px]" />
                  {Math.ceil(timeLeft / 60)} min remaining — finish the trial
                </div>
              )}
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-black/40 px-4 py-2 font-mono text-lg",
                    critical ? "border-accent-mock/40 text-accent-mock" : "border-white/10 text-accent-souls"
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <span aria-label={`Time remaining ${formatTime(timeLeft)}`}>{formatTime(timeLeft)}</span>
                </div>
                <GameButton
                  type="button"
                  variant="danger"
                  universe="souls"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4" /> Finish Trial
                </GameButton>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-accent-souls" /> Ember posture</span>
              <span>{Math.round(timeRatio * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timeRatio * 100)} aria-label="Time remaining">
              <div
                className={cn("h-full rounded-full transition-[width] duration-1000", critical ? "bg-accent-mock" : "bg-accent-souls")}
                style={{ width: `${timeRatio * 100}%` }}
              />
            </div>
          </div>
        </GameCard>

        {loadNotice && (
          <div className="flex items-start gap-3 rounded-2xl border border-accent-practice/20 bg-accent-practice/10 px-4 py-3 text-sm text-accent-practice">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-4">
          <GameCard universe="souls" className="flex min-h-[400px] flex-col justify-between p-6 md:p-8 lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={slide}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <span className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {currentQuestion.subject}
                  </span>
                  <h2 className="mt-4 text-lg font-medium leading-relaxed md:text-xl">
                    {currentQuestion.question_text}
                  </h2>
                </div>

                <div className="flex flex-col gap-3" role="group" aria-label="Answer stances">
                  {(currentQuestion.options || []).map((val, idx) => {
                    const key = OPTION_KEYS[idx] || String.fromCharCode(65 + idx)
                    const isSelected = answers[currentQuestion.id] === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, key)}
                        aria-pressed={isSelected}
                        className={cn(
                          "group flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-souls/50",
                          isSelected
                            ? "border-accent-souls bg-accent-souls/10 font-medium text-accent-souls"
                            : "border-white/5 bg-black/30 text-zinc-300 hover:border-accent-souls/30 hover:bg-accent-souls/5"
                        )}
                      >
                        <span className="flex items-center gap-4">
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold",
                              isSelected ? "border-transparent bg-accent-souls text-white" : "border-white/10 bg-zinc-900 text-zinc-400"
                            )}
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

            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/5 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-souls/50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Previous gate
              </button>
              <button
                type="button"
                onClick={() =>
                  setAnswers((prev) => {
                    const updated = { ...prev }
                    delete updated[currentQuestion.id]
                    return updated
                  })
                }
                className="text-xs text-zinc-500 underline underline-offset-4 transition-colors hover:text-accent-souls"
              >
                Clear stance
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.min(test.questions.length - 1, prev + 1))}
                disabled={currentIdx === test.questions.length - 1}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/5 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-souls/50 disabled:opacity-30"
              >
                Next gate <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </GameCard>

          <AnimatePresence>
            {isGridOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsGridOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          <div
            className={cn(
              "z-50 flex flex-col gap-4 border border-accent-souls/20 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl",
              "fixed inset-x-0 bottom-0 rounded-t-3xl transition-transform duration-300 lg:static lg:bottom-auto lg:rounded-3xl lg:translate-y-0",
              isGridOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Bonfire map</h3>
              <button
                type="button"
                onClick={() => setIsGridOpen(false)}
                className="p-2 -mr-2 text-zinc-400 hover:text-white lg:hidden"
                aria-label="Close bonfire map"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">{answeredCount} kindled · {test.questions.length - answeredCount} still dark</p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-4">
              {test.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = idx === currentIdx
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(idx)
                      setIsGridOpen(false)
                    }}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${idx + 1}${isAnswered ? ", answered" : ", unanswered"}`}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-souls/50",
                      isCurrent
                        ? "scale-105 border-transparent bg-white text-black shadow-lg"
                        : isAnswered
                        ? "border-accent-souls/40 bg-accent-souls/20 text-accent-souls"
                        : "border-white/5 bg-black/40 text-zinc-500 hover:border-zinc-600"
                    )}
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGridOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-accent-souls/30 bg-surface/90 p-4 text-white shadow-2xl lg:hidden",
              isGridOpen ? "scale-0" : "scale-100"
            )}
            aria-label="Open bonfire map"
          >
            <Target className="h-5 w-5 text-accent-souls" />
            <span className="text-sm font-bold">
              {currentIdx + 1} / {test.questions.length}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
