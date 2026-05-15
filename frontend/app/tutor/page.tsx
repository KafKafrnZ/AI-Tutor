"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, ArrowLeft, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";

// Custom Markdown Renderer (Fixes the red squiggly error and looks way better!)
const AnimatedMarkdown = ({ content, isLatest }: { content: string; isLatest: boolean }) => {
  const [displayedText, setDisplayedText] = useState(isLatest ? "" : content);
  
  useEffect(() => {
    if (!isLatest) { setDisplayedText(content); return; }
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(content.slice(0, i));
      i += 3; 
      if (i >= content.length) { clearInterval(timer); setDisplayedText(content); }
    }, 10);
    return () => clearInterval(timer);
  }, [content, isLatest]);

  return (
    <div className="text-[15px] leading-7 break-words text-zinc-300">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            return inline ? <span className="bg-white/5 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-white/10 text-emerald-400" {...props}>{children}</span>
              : <code className="text-emerald-400 font-mono text-[14px] leading-relaxed" {...props}>{children}</code>;
          },
          pre({ children }: any) {
            return <div className="bg-[#0d1117] border border-white/10 rounded-xl my-6 overflow-hidden shadow-lg">
                <div className="flex px-4 py-3 bg-white/5 border-b border-white/5 gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">{children}</pre>
              </div>;
          },
          strong({ children }) { return <strong className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-bold tracking-wide">{children}</strong>; },
          ul({ children }) { return <ul className="list-disc list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ol>; },
          p({ children }) { return <p className="mb-5 last:mb-0">{children}</p>; },
          h1({ children }) { return <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>; },
          h2({ children }) { return <h2 className="text-xl font-bold text-white mt-8 mb-4">{children}</h2>; },
          h3({ children }) { return <h3 className="text-lg font-bold text-white mt-6 mb-3">{children}</h3>; },
        }}
      >{displayedText}</ReactMarkdown>
    </div>
  );
};

export default function TutorPage() {
  const tutorMessages = useAppStore((state) => state.tutorMessages);
  const setTutorMessages = useAppStore((state) => state.setTutorMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const justSentRef = useRef(false);

  const isChatStarted = tutorMessages.length > 0;

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [tutorMessages]);

  const handleAskQuestion = async () => {
    if (!input.trim()) return;
    const userQuestion = input;
    setInput("");
    justSentRef.current = true;
    
    const currentMessages = useAppStore.getState().tutorMessages;
    setTutorMessages([...currentMessages, { role: "user", content: userQuestion }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: userQuestion, context: "" }),
      });
      if (!response.ok) throw new Error("Backend error");
      const data = await response.json();
      
      const updatedMessages = useAppStore.getState().tutorMessages;
      setTutorMessages([...updatedMessages, { role: "assistant", content: data.answer || "Sorry, I couldn't generate a response." }]);
    } catch (error) {
      const updatedMessages = useAppStore.getState().tutorMessages;
      setTutorMessages([...updatedMessages, { role: "assistant", content: "Connection error. Make sure your Python backend is running!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#09090b] relative">
      
      {/* Top Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md absolute top-0 w-full z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors"><ArrowLeft className="w-4 h-4" /></div>
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
      </div>

      {/* Dynamic Chat Area */}
      {isChatStarted && (
        <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-zinc-800 pt-24 pb-40">
          <div className="max-w-3xl mx-auto px-6 flex flex-col gap-10">
            {tutorMessages.map((msg, idx) => {
              const isLatestAssistantMessage = msg.role === "assistant" && idx === tutorMessages.length - 1 && justSentRef.current;
              const isUser = msg.role === "user";
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-md ${isUser ? "bg-zinc-800 border border-zinc-700" : "bg-gradient-to-br from-violet-600 to-fuchsia-600 border border-violet-500/50"}`}>
                    {isUser ? <User className="w-4 h-4 text-zinc-400" /> : <Sparkles className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col text-[15px] leading-7 text-zinc-200">
                    <span className="font-bold text-[12px] text-zinc-500 mb-2 uppercase tracking-widest">{isUser ? "You" : "AI Tutor"}</span>
                    {isUser ? <div className="whitespace-pre-wrap">{msg.content}</div> : <AnimatedMarkdown content={msg.content} isLatest={isLatestAssistantMessage} />}
                  </div>
                </motion.div>
              );
            })}
            
            {/* Grok-style Thinking Indicator */}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5"><Sparkles className="w-4 h-4 text-white animate-pulse" /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-[12px] text-zinc-500 mb-2 uppercase tracking-widest">AI Tutor</span>
                  <div className="flex items-center gap-3 text-zinc-300 font-medium mt-1">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    Agent thinking...
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      )}

      {/* Floating Command Bar Wrapper */}
      <div className={`absolute w-full px-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isChatStarted ? 'bottom-8 left-1/2 -translate-x-1/2 max-w-3xl' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl'}`}>
        
        {/* Initial Centered Text */}
        {!isChatStarted && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">What do you want to learn?</h1>
            <p className="text-zinc-500 font-medium">Ask complex concepts, get step-by-step breakdowns.</p>
          </div>
        )}

        {/* The Input Pill */}
        <motion.div layout className={`relative bg-zinc-900/90 backdrop-blur-2xl border transition-all duration-300 shadow-2xl rounded-[28px] overflow-hidden flex items-center ${isFocused ? 'border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.15)] ring-4 ring-violet-500/10' : 'border-white/10 hover:border-white/20'}`}>
          <textarea
            value={input}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskQuestion(); } }}
            placeholder="Message AI Tutor..."
            className="w-full bg-transparent max-h-32 min-h-[60px] py-4 pl-6 pr-14 text-white text-[15px] focus:outline-none resize-none placeholder:text-zinc-500 font-medium"
            rows={1}
          />
          <button
            onClick={handleAskQuestion}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2.5 bg-white text-black rounded-full hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </motion.div>
      </div>

    </div>
  );
}