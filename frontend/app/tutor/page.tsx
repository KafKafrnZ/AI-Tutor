"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, User, ArrowLeft, Sparkles, CheckCircle2, CircleDashed } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import VideoBackground from "@/components/VideoBackground";
import { API_URL } from "@/lib/api";
import VoiceInput from "@/components/VoiceInput";

const MIN_AGENT_DISPLAY_MS = 1800;
const REVEAL_TICK_MS = 22;
const REVEAL_CHARS_PER_TICK = 9;

const markdownComponents: Components = {
  code({ className, children }) {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    return (
      <code
        className={
          isBlock
            ? `text-emerald-300 font-mono text-[14px] leading-relaxed ${className ?? ""}`
            : "bg-white/10 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-white/10 text-emerald-300"
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
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">{children}</pre>
      </div>
    );
  },
  strong({ children }) {
    return <strong className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300 font-bold tracking-wide">{children}</strong>;
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

function readSsePayload(line: string): string | null {
  const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;

  if (normalizedLine.startsWith("data: ")) {
    return normalizedLine.slice(6);
  }

  if (normalizedLine.startsWith("data:")) {
    return normalizedLine.slice(5);
  }

  return null;
}

function parseSseToken(payload: string): string {
  try {
    const parsed: unknown = JSON.parse(payload);

    if (typeof parsed === "string") {
      return parsed;
    }

    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const data = (parsed as { data?: unknown }).data;
      return typeof data === "string" ? data : "";
    }
  } catch {
    return payload;
  }

  return "";
}

const MarkdownMessage = ({ content }: { content: string }) => {
  return (
    <div className="text-[15px] leading-7 break-words text-zinc-200">
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
};

export default function TutorPage() {
  const tutorMessages = useAppStore((state) => state.tutorMessages);
  const setTutorMessages = useAppStore((state) => state.setTutorMessages);
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
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
  const [agentStep, setAgentStep] = useState(0);

  const isChatStarted = tutorMessages.length > 0 || streamingContent.length > 0;
  const agentRows = [
    {
      icon: agentStep >= 1 ? CheckCircle2 : CircleDashed,
      label: "PYQ Agent",
      detail: agentStep >= 1 ? "Relevant context selected" : "Searching exam corpus",
      done: agentStep >= 1,
      active: agentStep === 0,
    },
    {
      icon: agentStep >= 2 ? CheckCircle2 : CircleDashed,
      label: "Reasoning Agent",
      detail: agentStep >= 2 ? "Answer structure prepared" : "Building the explanation",
      done: agentStep >= 2,
      active: agentStep === 1,
    },
    {
      icon: agentStep >= 3 ? CheckCircle2 : CircleDashed,
      label: "Review Agent",
      detail: agentStep >= 3 ? "Ready to respond" : "Cross-checking clarity",
      done: agentStep >= 3,
      active: agentStep >= 2,
    },
  ];

  // Load conversation history from DB on first mount
  useEffect(() => {
    if (historyLoaded || tutorMessages.length > 0) { setHistoryLoaded(true); return; }
    fetch(`${API_URL}/conversations?limit=50`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs: { role: string; content: string }[]) => {
        if (msgs.length > 0) setTutorMessages(msgs);
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [tutorMessages, streamingContent]);

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
      setInput(q);
    }
  }, [searchParams]);

  const handleAskQuestion = async (overrideInput?: string | React.MouseEvent | React.KeyboardEvent) => {
    const userQuestion = typeof overrideInput === "string" ? overrideInput : input;
    if (!userQuestion.trim()) return;
    setInput("");
    
    const currentMessages = useAppStore.getState().tutorMessages;
    const history = currentMessages.slice(-10);
    setTutorMessages([...currentMessages, { role: "user", content: userQuestion }]);
    setIsLoading(true);
    setStreamingContent("");
    streamingFullRef.current = "";
    displayQueueRef.current = "";
    streamClosedRef.current = false;
    responseReleaseAtRef.current = Date.now() + MIN_AGENT_DISPLAY_MS;
    streamFinalizedRef.current = false;
    scheduleAgentStages();
    startDisplayPump();

    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const response = await fetch(`${API_URL}/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          question: userQuestion,
          context: "",
          history,
        }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 401) throw new Error("SESSION_EXPIRED");
        if (response.status === 429) throw new Error("RATE_LIMITED");
        throw new Error(`HTTP_${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // Buffer incomplete SSE lines that span across chunk boundaries
      let sseLineBuffer = "";
      const processSseLine = (line: string) => {
        const payload = readSsePayload(line);
        if (payload === null) return;
        if (payload === "[DONE]") {
          return;
        }
        if (payload.length === 0) return;

        const token = parseSseToken(payload).replace(/\\n/g, "\n");

        if (token.length > 0) {
          streamingFullRef.current += token;
          displayQueueRef.current += token;
        }
      };

      try {
        while (true) {
          const { value, done: doneReading } = await reader.read();
          if (doneReading) break;
          if (!value) continue;

          // Accumulate into buffer so split-across-chunk lines are reassembled
          sseLineBuffer += decoder.decode(value, { stream: true });
          const lines = sseLineBuffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          sseLineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            processSseLine(line);
          }
        }
        sseLineBuffer += decoder.decode();
        if (sseLineBuffer.length > 0) {
          for (const line of sseLineBuffer.split("\n")) {
            processSseLine(line);
          }
          sseLineBuffer = "";
        }
      } catch {
        // Stream dropped mid-response. If we received content already, finalize
        // what arrived rather than discarding it and showing "Connection error".
        if (streamingFullRef.current.length === 0) {
          throw new Error("STREAM_DROPPED");
        }
        // else fall through to finalization below with partial content
      }
      streamClosedRef.current = true;
      await waitForDisplayDrain();

      // Finalize the streamed answer into history
      if (!streamFinalizedRef.current) {
        streamFinalizedRef.current = true;
        const finalAnswer = streamingFullRef.current || "No response received.";
        const updatedMessages = useAppStore.getState().tutorMessages;
        setTutorMessages([...updatedMessages, { role: "assistant", content: finalAnswer }]);
        // Persist exchange to DB — fire and forget, never block the UI
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
      let errorContent = "Connection error. Please check your network and try again.";
      if (msg === "SESSION_EXPIRED") {
        errorContent = "Your session has expired. Please [log in again](/login).";
      } else if (msg === "RATE_LIMITED") {
        errorContent = "You've sent too many messages. Please wait a minute and try again.";
      } else if (msg === "HTTP_502") {
        errorContent = "The tutor service is temporarily unavailable. Please try again shortly.";
      } else if (msg.startsWith("HTTP_5")) {
        errorContent = `Server error (${msg.slice(5)}). Please try again shortly.`;
      } else if (msg === "STREAM_DROPPED") {
        errorContent = "Stream disconnected before any response arrived. Please try again.";
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

  return (
    <div className="h-dvh flex flex-col bg-transparent relative overflow-hidden pb-safe">
      
      <VideoBackground posterSrc="/media/tutor-ambient-poster.jpg" />
      
      {/* Top Header - Now a transparent gradient fade instead of a solid line */}
      <div className="h-24 flex items-start pt-6 px-6 shrink-0 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 pointer-events-none">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors group pointer-events-auto h-11 px-2">
          <div className="w-11 h-11 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5" /></div>
          <span className="font-medium text-sm drop-shadow-md">Dashboard</span>
        </Link>
      </div>

      {/* Dynamic Chat Area */}
      {isChatStarted && (
        <div className="flex-1 min-h-0 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-white/10 pt-24 pb-40 relative z-10">
          <div className="max-w-3xl mx-auto px-6 flex flex-col gap-10">
            {tutorMessages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg backdrop-blur-md border ${isUser ? "bg-black/40 border-white/10" : "bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 border-white/20"}`}>
                    {isUser ? <User className="w-4 h-4 text-zinc-300" /> : <Sparkles className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col text-[15px] leading-7 text-zinc-200">
                    <span className="font-bold text-[12px] text-zinc-400 mb-2 uppercase tracking-widest drop-shadow-md">{isUser ? "You" : "AI Tutor"}</span>
                    {/* Highly transparent user message bubble */}
                    {isUser ? <div className="whitespace-pre-wrap bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">{msg.content}</div> : <MarkdownMessage content={msg.content} />}
                  </div>
                </motion.div>
              );
            })}

            {/* Agent thinking indicator — shown while waiting for the first streaming token */}
            {isLoading && !streamingContent && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg backdrop-blur-md border bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 border-white/20">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="font-bold text-[12px] text-zinc-400 mb-3 uppercase tracking-widest drop-shadow-md">AI Tutor</span>
                  <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                    {agentRows.map(({ icon: Icon, label, detail, done, active }, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15, duration: 0.35 }}
                        className="flex items-center gap-3 text-[13px]"
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${done ? "text-emerald-400" : active ? "text-violet-300 animate-spin" : "text-zinc-600"}`}
                          style={!done ? { animationDuration: "2.5s" } : {}}
                        />
                        <div className="min-w-0">
                          <div className={done ? "text-zinc-200" : active ? "text-zinc-300" : "text-zinc-500"}>{label}</div>
                          <div className="text-[12px] text-zinc-500">{detail}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Live streaming assistant reply (plain token accumulation from backend) - instant for live tokens */}
            {streamingContent && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg backdrop-blur-md border bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 border-white/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col text-[15px] leading-7 text-zinc-200">
                  <span className="font-bold text-[12px] text-zinc-400 mb-2 uppercase tracking-widest drop-shadow-md">AI Tutor</span>
                  <div className="relative">
                    <MarkdownMessage content={streamingContent} />
                    <button
                      onClick={() => {
                        displayQueueRef.current = "";
                        setStreamingContent(streamingFullRef.current || streamingContent);
                        resolveDrainIfReady();
                      }}
                      className="absolute -top-2 -right-2 text-[10px] px-3 py-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-zinc-300"
                    >
                      Show full
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      )}

      {/* Floating Command Bar Wrapper */}
      <div className={`absolute w-full px-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-20 ${isChatStarted ? 'bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 max-w-3xl pb-[env(safe-area-inset-bottom)]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl'}`}>
        {!isChatStarted && (
          <div className="text-center mb-8 relative z-20">
            <div className="w-16 h-16 bg-black/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-8 h-8 text-violet-300" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">What do you want to learn?</h1>
            <p className="text-zinc-300 font-medium drop-shadow-md mb-8">Ask complex concepts. Grounded answers with previous-year context.</p>
            
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
              {[
                "Explain monetary policy",
                "Difference between NEFT and RTGS",
                "Summarize Indian Constitution Part III",
                "Basel III norms explained"
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleAskQuestion(prompt)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-zinc-300 transition-colors backdrop-blur-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The Input Pill - Now ultra-glassy */}
        <motion.div layout className={`relative bg-black/30 backdrop-blur-2xl border transition-all duration-300 shadow-2xl rounded-[28px] overflow-hidden flex items-center ${isFocused ? 'border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.2)] ring-4 ring-violet-500/20' : 'border-white/10 hover:border-white/20'}`}>
          <textarea
            value={input}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskQuestion(); } }}
            placeholder="Message AI Tutor..."
            className="w-full bg-transparent max-h-32 min-h-[60px] py-4 pl-6 pr-14 text-white text-[15px] focus:outline-none resize-none placeholder:text-zinc-400 font-medium"
            rows={1}
          />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              <VoiceInput
                onTranscript={(text) => setInput((prev) => (prev ? prev + " " + text : text))}
                isProcessing={isLoading}
              />
              <button
                onClick={handleAskQuestion}
                disabled={isLoading || !input.trim()}
                className="w-11 h-11 flex items-center justify-center bg-white/90 text-black rounded-full hover:bg-white transition-all shadow-lg disabled:opacity-30 disabled:bg-white/20 disabled:text-white"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
        </motion.div>
      </div>

    </div>
  );
}
