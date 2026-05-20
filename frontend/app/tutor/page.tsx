"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, ArrowLeft, Sparkles, CheckCircle2, CircleDashed } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import BlackholeBackground from "@/components/ui/Blackhole";

// Custom Markdown Renderer 
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
    <div className="text-[15px] leading-7 break-words text-zinc-200">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            return inline ? <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-white/10 text-emerald-300" {...props}>{children}</span>
              : <code className="text-emerald-300 font-mono text-[14px] leading-relaxed" {...props}>{children}</code>;
          },
          pre({ children }: any) {
            // Highly transparent code blocks
            return <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl my-6 overflow-hidden shadow-lg">
                <div className="flex px-4 py-3 bg-white/5 border-b border-white/5 gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">{children}</pre>
              </div>;
          },
          strong({ children }) { return <strong className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300 font-bold tracking-wide">{children}</strong>; },
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
  
  const [agentThoughts, setAgentThoughts] = useState<{agent: string, message: string}[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const justSentRef = useRef(false);

  const isChatStarted = tutorMessages.length > 0;

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [tutorMessages, agentThoughts]);

  const handleAskQuestion = async () => {
    if (!input.trim()) return;
    const userQuestion = input;
    setInput("");
    justSentRef.current = true;
    
    setAgentThoughts([]);
    const currentMessages = useAppStore.getState().tutorMessages;
    setTutorMessages([...currentMessages, { role: "user", content: userQuestion }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: userQuestion, context: "" }),
      });

      if (!response.ok || !response.body) throw new Error("Backend error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (!value) continue;
        
        const chunkValue = decoder.decode(value, { stream: true });
        
        const events = chunkValue.split("data: ");
        
        for (const event of events) {
          const cleanEvent = event.trim(); 
          if (!cleanEvent) continue;

          try {
            const data = JSON.parse(cleanEvent);
            
            if (data.type === "thought") {
              setAgentThoughts(prev => [...prev, { agent: data.agent, message: data.message }]);
            } 
            else if (data.type === "result") {
              const updatedMessages = useAppStore.getState().tutorMessages;
              setTutorMessages([...updatedMessages, { role: "assistant", content: data.answer }]);
            }
          } catch (e) {
            // Silently ignore split-chunk fragments
          }
        }
      }
    } catch (error) {
      const updatedMessages = useAppStore.getState().tutorMessages;
      setTutorMessages([...updatedMessages, { role: "assistant", content: "Connection error. Make sure your Python backend is running!" }]);
    } finally {
      setIsLoading(false);
      setAgentThoughts([]); 
    }
  };

  return (
    <div className="h-screen flex flex-col bg-transparent relative overflow-hidden">
      
      {/* --- THE 3D BACKGROUND --- */}
      <BlackholeBackground />
      
      {/* Top Header - Now a transparent gradient fade instead of a solid line */}
      <div className="h-24 flex items-start pt-6 px-6 shrink-0 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 pointer-events-none">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors group pointer-events-auto">
          <div className="p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors"><ArrowLeft className="w-4 h-4" /></div>
          <span className="font-medium text-sm drop-shadow-md">Dashboard</span>
        </Link>
      </div>

      {/* Dynamic Chat Area */}
      {isChatStarted && (
        <div className="flex-1 min-h-0 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-white/10 pt-24 pb-40 relative z-10">
          <div className="max-w-3xl mx-auto px-6 flex flex-col gap-10">
            {tutorMessages.map((msg, idx) => {
              const isLatestAssistantMessage = msg.role === "assistant" && idx === tutorMessages.length - 1 && justSentRef.current;
              const isUser = msg.role === "user";
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg backdrop-blur-md border ${isUser ? "bg-black/40 border-white/10" : "bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 border-white/20"}`}>
                    {isUser ? <User className="w-4 h-4 text-zinc-300" /> : <Sparkles className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col text-[15px] leading-7 text-zinc-200">
                    <span className="font-bold text-[12px] text-zinc-400 mb-2 uppercase tracking-widest drop-shadow-md">{isUser ? "You" : "AI Tutor"}</span>
                    {/* Highly transparent user message bubble */}
                    {isUser ? <div className="whitespace-pre-wrap bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">{msg.content}</div> : <AnimatedMarkdown content={msg.content} isLatest={isLatestAssistantMessage} />}
                  </div>
                </motion.div>
              );
            })}
            
            {/* --- THE GROK-STYLE MULTI-AGENT THOUGHT BUBBLES --- */}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-violet-400 animate-pulse" />
                  </div>
                  <span className="font-bold text-sm text-zinc-300 flex items-center gap-2 drop-shadow-md">
                    Agents Deliberating...
                  </span>
                </div>
                
                <div className="flex flex-col gap-4 ml-[44px]">
                  <AnimatePresence>
                    {agentThoughts.map((thought, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 max-w-xl"
                      >
                        {/* Agent Identity */}
                        <div className="flex items-center gap-2 text-[13px] font-bold text-zinc-300 drop-shadow-md">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-sm border ${i === 0 ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'}`}>
                            <Bot className="w-3 h-3" />
                          </div>
                          {thought.agent}
                        </div>
                        
                        {/* Highly transparent thought box */}
                        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-[14px] text-zinc-200 leading-relaxed shadow-xl">
                          {thought.message}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      )}

      {/* Floating Command Bar Wrapper */}
      <div className={`absolute w-full px-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-20 ${isChatStarted ? 'bottom-8 left-1/2 -translate-x-1/2 max-w-3xl' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl'}`}>
        {!isChatStarted && (
          <div className="text-center mb-8 relative z-20">
            <div className="w-16 h-16 bg-black/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-8 h-8 text-violet-300" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">What do you want to learn?</h1>
            <p className="text-zinc-300 font-medium drop-shadow-md">Ask complex concepts, watch the agents work.</p>
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
          <button
            onClick={handleAskQuestion}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2.5 bg-white/90 text-black rounded-full hover:bg-white transition-all shadow-lg disabled:opacity-30 disabled:bg-white/20 disabled:text-white"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </motion.div>
      </div>

    </div>
  );
}