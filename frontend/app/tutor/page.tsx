"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, User, ArrowLeft, Sparkles, CheckCircle2, CircleDashed, Bot } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import VideoBackground from "@/components/VideoBackground";
import { API_URL, fetchWithRefresh } from "@/lib/api";
import { createSseParser } from "@/lib/sse";
import VoiceInput from "@/components/VoiceInput";
import { GameAtmosphere, GameCard } from "@/components/game/GamePrimitives";
import { cn } from "@/lib/utils";
import TutorLoading from "./loading";

const MIN_AGENT_DISPLAY_MS = 1800;
const REVEAL_TICK_MS = 22;
const REVEAL_CHARS_PER_TICK = 9;

const CHAMBER_PROMPTS = [
  {
    id: "01",
    title: "Monetary policy",
    detail: "RBI tools, inflation, transmission",
    prompt: "Explain monetary policy with PYQ context for IBPS and UPSC.",
  },
  {
    id: "02",
    title: "NEFT vs RTGS",
    detail: "Settlement rails and limits",
    prompt: "Compare NEFT and RTGS for bank exam MCQs and interviews.",
  },
  {
    id: "03",
    title: "Constitution Part III",
    detail: "Fundamental rights and tests",
    prompt: "Explain Constitution Part III Fundamental Rights with landmark cases useful for UPSC.",
  },
  {
    id: "04",
    title: "Basel III",
    detail: "Capital, liquidity, buffers",
    prompt: "Explain Basel III norms for IBPS SO IT and banking exams.",
  },
] as const;

const markdownComponents: Components = {
  code({ className, children }) {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    return (
      <code
        className={
          isBlock
            ? `text-accent-progress font-mono text-[14px] leading-relaxed ${className ?? ""}`
            : "bg-white/10 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-white/10 text-accent-progress"
        }
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl my-6 overflow-hidden shadow-lg">
        <div className="flex px-4 py-3 bg-white/5 border-b border-white/5 gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-mock/80" />
          <div className="w-3 h-3 rounded-full bg-accent-practice/80" />
          <div className="w-3 h-3 rounded-full bg-accent-progress/80" />
        </div>
        <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">{children}</pre>
      </div>
    );
  },
  strong({ children }) {
    return <strong className="text-accent font-bold tracking-wide">{children}</strong>;
  },
  ul({ children }) {
    return <ul className="list-disc list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ol>;
  },
  p({ children }) {
    return <p className="mb-5 last:mb-0">{children}</p>;
  },
  h1({ children }) {
    return <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-xl font-bold text-white mt-8 mb-4">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-lg font-bold text-white mt-6 mb-3">{children}</h3>;
  },
};

const MarkdownMessage = ({ content }: { content: string }) => {
  return (
    <div className="text-[15px] leading-7 break-words text-zinc-200">
      <ReactMarkdown components={markdownComponents} rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  );
};

function TutorPageInner() {
  const tutorMessages = useAppStore((state) => state.tutorMessages);
  const setTutorMessages = useAppStore((state) => state.setTutorMessages);
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [interruptedQuestion, setInterruptedQuestion] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingFullRef = useRef(""); // for skip / finalize
  const displayQueueRef = useRef("");
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamClosedRef = useRef(false);
  const responseReleaseAtRef = useRef(0);
  const drainResolverRef = useRef<(() => void) | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamFinalizedRef = useRef(false);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastQuestion = useRef("");
  const lastEventIdRef = useRef("");
  const [agentStep, setAgentStep] = useState(0);
  const reduceMotion = useReducedMotion();

  const isChatStarted = tutorMessages.length > 0 || streamingContent.length > 0;
  const agentRows = [
    {
      icon: agentStep >= 1 ? CheckCircle2 : CircleDashed,
      label: "Archive Core",
      detail: agentStep >= 1 ? "Relevant context selected" : "Searching exam corpus",
      done: agentStep >= 1,
      active: agentStep === 0,
    },
    {
      icon: agentStep >= 2 ? CheckCircle2 : CircleDashed,
      label: "Logic Core",
      detail: agentStep >= 2 ? "Answer structure prepared" : "Building the chamber solution",
      done: agentStep >= 2,
      active: agentStep === 1,
    },
    {
      icon: agentStep >= 3 ? CheckCircle2 : CircleDashed,
      label: "Review Core",
      detail: agentStep >= 3 ? "Ready to respond" : "Cross-checking clarity protocol",
      done: agentStep >= 3,
      active: agentStep >= 2,
    },
  ];

  // Load conversation history from DB on first mount
  useEffect(() => {
    if (historyLoaded || tutorMessages.length > 0) {
      queueMicrotask(() => setHistoryLoaded(true));
      return;
    }
    fetchWithRefresh(`${API_URL}/conversations?limit=50`, { method: "GET" })
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs: { role: string; content: string }[]) => {
        if (msgs.length > 0) setTutorMessages(msgs.map((m) => ({ ...m, role: m.role as "user" | "assistant" })));
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [tutorMessages, streamingContent, reduceMotion]);

  const clearAgentTimers = () => {
    for (const timer of agentTimersRef.current) {
      clearTimeout(timer);
    }
    agentTimersRef.current = [];
  };

  const scheduleAgentStages = () => {
    clearAgentTimers();
    setAgentStep(0);
    agentTimersRef.current = [
      setTimeout(() => setAgentStep(1), 450),
      setTimeout(() => setAgentStep(2), 1050),
      setTimeout(() => setAgentStep(3), MIN_AGENT_DISPLAY_MS),
    ];
  };

  const stopDisplayPump = () => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  };

  const resolveDrainIfReady = () => {
    if (streamClosedRef.current && displayQueueRef.current.length === 0) {
      drainResolverRef.current?.();
      drainResolverRef.current = null;
      stopDisplayPump();
    }
  };

  const startDisplayPump = () => {
    stopDisplayPump();
    displayTimerRef.current = setInterval(() => {
      if (Date.now() < responseReleaseAtRef.current) return;

      const pending = displayQueueRef.current;
      if (!pending) {
        resolveDrainIfReady();
        return;
      }

      const take = Math.min(REVEAL_CHARS_PER_TICK, pending.length);
      displayQueueRef.current = pending.slice(take);
      setStreamingContent((prev) => prev + pending.slice(0, take));
      resolveDrainIfReady();
    }, REVEAL_TICK_MS);
  };

  const waitForDisplayDrain = async () => {
    if (displayQueueRef.current.length === 0) return;
    await new Promise<void>((resolve) => {
      drainResolverRef.current = resolve;
    });
  };

  useEffect(() => {
    return () => {
      stopDisplayPump();
      clearAgentTimers();
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      queueMicrotask(() => setInput(q));
    }
  }, [searchParams]);

  const handleAskQuestion = async (overrideInput?: string | React.MouseEvent | React.KeyboardEvent) => {
    const userQuestion = typeof overrideInput === "string" ? overrideInput : input;
    if (!userQuestion.trim()) return;
    setInput("");
    setStreamError("");
    setInterruptedQuestion("");
    lastQuestion.current = userQuestion;
    
    const currentMessages = useAppStore.getState().tutorMessages;
    const last = currentMessages[currentMessages.length - 1];
    const alreadyPosted = last?.role === "user" && last.content === userQuestion;
    const prior = alreadyPosted ? currentMessages.slice(0, -1) : currentMessages;
    const history = prior.slice(-10);
    if (!alreadyPosted) {
      setTutorMessages([...currentMessages, { role: "user", content: userQuestion }]);
    }
    setIsLoading(true);
    setStreamingContent("");
    streamingFullRef.current = "";
    displayQueueRef.current = "";
    streamClosedRef.current = false;
    // eslint-disable-next-line react-hooks/purity
    responseReleaseAtRef.current = Date.now() + MIN_AGENT_DISPLAY_MS;
    streamFinalizedRef.current = false;
    scheduleAgentStages();
    startDisplayPump();

    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    const streamPayload = JSON.stringify({ question: userQuestion, context: "", history });
    lastEventIdRef.current = "";
    try {
      let sseError = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        if (abortController.signal.aborted) return;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (lastEventIdRef.current) headers["Last-Event-ID"] = lastEventIdRef.current;

        const response = await fetchWithRefresh(`${API_URL}/ask/stream`, {
          method: "POST",
          headers,
          signal: abortController.signal,
          body: streamPayload,
        });

        if (!response.ok || !response.body) {
          if (response.status === 401) throw new Error("SESSION_EXPIRED");
          if (response.status === 429) {
            const body = await response.json().catch(() => ({}));
            throw new Error(
              (body as { error?: { code?: string } })?.error?.code === "QUOTA_EXCEEDED"
                ? "QUOTA_EXCEEDED"
                : "RATE_LIMITED"
            );
          }
          throw new Error(`HTTP_${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parseSse = createSseParser();
        let sseLineBuffer = "";
        sseError = "";
        const processSseLine = (line: string) => {
          const parsed = parseSse(line);
          if (parsed.id) {
            const prev = lastEventIdRef.current;
            lastEventIdRef.current = parsed.id;
            if (prev && parsed.id.split(":")[0] !== prev.split(":")[0]) {
              streamingFullRef.current = "";
              displayQueueRef.current = "";
            }
          }
          if (parsed.done) return;
          if (parsed.error) {
            sseError = parsed.error;
            return;
          }
          const token = (parsed.token ?? "").replace(/\\n/g, "\n");
          if (token.length > 0) {
            streamingFullRef.current += token;
            displayQueueRef.current += token;
          }
        };

        let dropped = false;
        try {
          while (true) {
            const { value, done: doneReading } = await reader.read();
            if (doneReading) break;
            if (!value) continue;
            sseLineBuffer += decoder.decode(value, { stream: true });
            const lines = sseLineBuffer.split("\n");
            sseLineBuffer = lines.pop() ?? "";
            for (const line of lines) processSseLine(line);
          }
          sseLineBuffer += decoder.decode();
          if (sseLineBuffer.length > 0) {
            for (const line of sseLineBuffer.split("\n")) processSseLine(line);
          }
        } catch {
          dropped = true;
        }

        if (dropped && !abortController.signal.aborted && attempt < 2) {
          continue;
        }
        if (dropped && streamingFullRef.current.length === 0) {
          throw new Error("STREAM_DROPPED");
        }
        if (dropped) {
          const interruptedNote = "\n\n*(Connection interrupted - response may be incomplete.)*";
          streamingFullRef.current += interruptedNote;
          displayQueueRef.current += interruptedNote;
          setInterruptedQuestion(userQuestion);
        }
        break;
      }
      if (sseError && streamingFullRef.current.length === 0) {
        setStreamError(sseError);
        setInterruptedQuestion(userQuestion);
        streamClosedRef.current = true;
        return;
      }
      if (sseError) {
        setStreamError(sseError);
        setInterruptedQuestion(userQuestion);
      }
      streamClosedRef.current = true;
      await waitForDisplayDrain();

      if (!streamFinalizedRef.current) {
        streamFinalizedRef.current = true;
        const finalAnswer = streamingFullRef.current || "No response received.";
        const updatedMessages = useAppStore.getState().tutorMessages;
        setTutorMessages([...updatedMessages, { role: "assistant", content: finalAnswer }]);
        fetch(`${API_URL}/conversations/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: userQuestion, answer: finalAnswer }),
        }).catch(() => {});
      }
    } catch (error) {
      if (abortController.signal.aborted || streamFinalizedRef.current) return;
      const updatedMessages = useAppStore.getState().tutorMessages;
      const msg = error instanceof Error ? error.message : "";
      if (msg === "STREAM_DROPPED") {
        setStreamError("Connection failed after 2 attempts. Please try again.");
        return;
      }

      let errorContent = "Connection error. Please check your network and try again.";
      if (msg === "SESSION_EXPIRED") {
        errorContent = "Your session has expired. Please [log in again](/login).";
      } else if (msg === "QUOTA_EXCEEDED") {
        errorContent = "Daily plan limit reached. Try again tomorrow, or upgrade your plan.";
      } else if (msg === "RATE_LIMITED") {
        errorContent = "You've sent too many messages. Please wait a minute and try again.";
      } else if (msg === "HTTP_502") {
        errorContent = "The tutor service is temporarily unavailable. Please try again shortly.";
      } else if (msg.startsWith("HTTP_5")) {
        errorContent = `Server error (${msg.slice(5)}). Please try again shortly.`;
      }
      setTutorMessages([...updatedMessages, { role: "assistant", content: errorContent }]);
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      clearAgentTimers();
      stopDisplayPump();
      displayQueueRef.current = "";
      streamClosedRef.current = false;
      drainResolverRef.current?.();
      drainResolverRef.current = null;
      setIsLoading(false);
      setStreamingContent("");
      streamingFullRef.current = "";
    }
  };

  const commandRail = (
    <motion.div
      layout={!reduceMotion}
      className={cn(
        "relative flex items-center overflow-hidden rounded-[28px] border bg-black/40 shadow-2xl backdrop-blur-2xl transition-all duration-300",
        isFocused
          ? "border-accent-portal/50 shadow-[0_0_40px_rgba(139,92,246,0.2)] ring-4 ring-accent-portal/20"
          : "border-white/10 hover:border-accent-portal/30"
      )}
    >
      <label htmlFor="chamber-input" className="sr-only">Ask the chamber core</label>
      <textarea
        id="chamber-input"
        value={input}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAskQuestion(); } }}
        placeholder="Ask the chamber core a concept..."
        className="w-full max-h-32 min-h-[60px] resize-none bg-transparent py-4 pl-6 pr-28 text-[15px] font-medium text-white placeholder:text-zinc-400 focus:outline-none"
        rows={1}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        <VoiceInput
          onTranscript={(text) => setInput((prev) => (prev ? prev + " " + text : text))}
          isProcessing={isLoading}
        />
        <button
          type="button"
          onClick={() => void handleAskQuestion()}
          disabled={isLoading || !input.trim()}
          aria-label="Send question"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-portal/50 disabled:bg-white/20 disabled:text-white disabled:opacity-30"
        >
          <Send className="ml-0.5 h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-transparent pb-[env(safe-area-inset-bottom,0px)]">
      <VideoBackground posterSrc="/media/tutor-ambient-poster.jpg" />
      <GameAtmosphere universe="portal" intensity="quiet" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-5 sm:px-6">
        <Link
          href="/dashboard"
          className="pointer-events-auto flex h-11 items-center gap-2 px-2 text-zinc-300 transition-colors hover:text-white"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-md">
            <ArrowLeft className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium drop-shadow-md">War Room</span>
        </Link>
        <div className="pointer-events-none hidden pr-2 pt-1 text-right sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent-portal">Cognitive Calibration</p>
          <p className="text-sm font-semibold text-white">
            {isChatStarted ? "Chamber live" : "Chamber 00 — idle"}
          </p>
        </div>
      </header>

      {isChatStarted ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pb-40 pt-24 scrollbar-thin scrollbar-thumb-white/10">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
            {tutorMessages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={idx}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-md",
                      isUser ? "border-white/10 bg-black/40" : "border-accent-portal/30 bg-accent-portal/20"
                    )}
                  >
                    {isUser ? <User className="h-4 w-4 text-zinc-300" /> : <Bot className="h-4 w-4 text-accent-portal" />}
                  </div>
                  <div className="min-w-0 flex-1 text-[15px] leading-7 text-zinc-200">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      {isUser ? "Test subject" : "Aperture tutor core"}
                    </span>
                    {isUser ? (
                      <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-accent-portal/15 bg-white/5 p-4 backdrop-blur-md">
                        <MarkdownMessage content={msg.content} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {isLoading && !streamingContent && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-portal/30 bg-accent-portal/20">
                  <Sparkles className={cn("h-4 w-4 text-accent-portal", !reduceMotion && "animate-pulse")} />
                </div>
                <GameCard universe="portal" className="min-w-0 flex-1 p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Core stages</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {agentRows.map(({ icon: Icon, label, detail, done, active }, i) => (
                      <div
                        key={label}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-[13px]",
                          done
                            ? "border-accent-progress/30 bg-accent-progress/10"
                            : active
                            ? "border-accent-portal/40 bg-accent-portal/10"
                            : "border-white/10 bg-black/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              done ? "text-accent-progress" : active ? "text-accent-portal" : "text-zinc-600",
                              active && !done && !reduceMotion && "animate-spin"
                            )}
                            style={active && !done && !reduceMotion ? { animationDuration: "2.5s" } : undefined}
                          />
                          <span className={done ? "text-zinc-200" : active ? "text-zinc-100" : "text-zinc-500"}>
                            {label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">{detail}</p>
                        <span className="sr-only">{`Stage ${i + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </GameCard>
              </motion.div>
            )}

            {streamingContent && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-portal/30 bg-accent-portal/20">
                  <Bot className="h-4 w-4 text-accent-portal" />
                </div>
                <div className="relative min-w-0 flex-1 text-[15px] leading-7 text-zinc-200">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Aperture tutor core
                  </span>
                  <div className="rounded-2xl border border-accent-portal/20 bg-white/5 p-4 backdrop-blur-md">
                    <MarkdownMessage content={streamingContent} />
                    <button
                      type="button"
                      onClick={() => {
                        displayQueueRef.current = "";
                        setStreamingContent(streamingFullRef.current || streamingContent);
                        resolveDrainIfReady();
                      }}
                      className="absolute -right-1 -top-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-[10px] font-semibold text-zinc-300 hover:bg-white/20"
                    >
                      Show full answer
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {(streamError || interruptedQuestion) && (
              <div className="rounded-2xl border border-accent-practice/25 bg-accent-practice/10 p-4 text-sm text-accent-practice md:ml-[52px]">
                {streamError || "Connection interrupted. You can retry the same question."}
                <button
                  type="button"
                  onClick={() => {
                    const question = interruptedQuestion || lastQuestion.current;
                    setStreamError("");
                    setInterruptedQuestion("");
                    void handleAskQuestion(question);
                  }}
                  className="ml-3 rounded-lg border border-accent-practice/30 px-3 py-1.5 font-semibold text-accent-practice transition-colors hover:bg-accent-practice/10"
                >
                  Recalibrate chamber
                </button>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-10 pt-24">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent-portal/40 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-accent-portal/15">
                <Sparkles className="h-7 w-7 text-accent-portal" />
              </div>
            </div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-accent-portal">Aperture Study Chamber</p>
            <h1 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">What chamber are we testing?</h1>
            <p className="mx-auto max-w-xl text-zinc-300">
              Ask a concept. The cores will retrieve PYQ context and answer as if this was always the test.
            </p>
          </div>

          <div className="mb-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
            {CHAMBER_PROMPTS.map((chamber) => (
              <button
                key={chamber.id}
                type="button"
                onClick={() => void handleAskQuestion(chamber.prompt)}
                className="rounded-[var(--radius-token)] border border-accent-portal/20 bg-black/30 p-4 text-left backdrop-blur-xl transition-colors hover:border-accent-portal/50 hover:bg-accent-portal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-portal/50"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-portal">Chamber {chamber.id}</p>
                <p className="mt-1 text-base font-bold text-white">{chamber.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{chamber.detail}</p>
              </button>
            ))}
          </div>

          <div className="w-full max-w-2xl">{commandRail}</div>
        </div>
      )}

      {isChatStarted && (
        <div className="absolute bottom-6 left-1/2 z-20 w-full max-w-3xl -translate-x-1/2 px-6 pb-[env(safe-area-inset-bottom)] md:bottom-8">
          {commandRail}
        </div>
      )}
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<TutorLoading />}>
      <TutorPageInner />
    </Suspense>
  );
}
