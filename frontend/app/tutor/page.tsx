"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

// --- CUSTOM TYPEWRITER COMPONENT ---
const AnimatedMarkdown = ({ content, isLatest }: { content: string; isLatest: boolean }) => {
  const [displayedText, setDisplayedText] = useState(isLatest ? "" : content);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(content);
      return;
    }

    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(content.slice(0, i));
      i += 3; 
      if (i >= content.length) {
        clearInterval(timer);
        setDisplayedText(content);
      }
    }, 10);

    return () => clearInterval(timer);
  }, [content, isLatest]);

  return (
    <div className="text-[15px] leading-7 break-words text-zinc-300">
      <ReactMarkdown
        components={{
          // Colorful inline keywords (Rainbow Effect)
          code({ node, inline, className, children, ...props }: any) {
            return inline ? (
              <span className="rainbow-keyword bg-white/5 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-white/10 shadow-sm" {...props}>
                {children}
              </span>
            ) : (
              <code className="text-emerald-400 font-mono text-[14px] leading-relaxed" {...props}>
                {children}
              </code>
            );
          },
          // macOS Terminal Style Block Code
          pre({ children }: any) {
            return (
              <div className="bg-[#0d1117] border border-white/10 rounded-xl my-6 overflow-hidden shadow-lg">
                <div className="flex items-center px-4 py-3 bg-white/5 border-b border-white/5 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                  <span className="ml-2 text-xs text-zinc-500 font-mono">terminal_output.exe</span>
                </div>
                <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
                  {children}
                </pre>
              </div>
            );
          },
          // Gradient Bold Text
          strong({ children }) {
            return (
              <strong className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-bold tracking-wide">
                {children}
              </strong>
            );
          },
          // Clean lists
          ul({ children }) {
            return <ul className="list-disc list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside space-y-2 ml-5 my-4 text-zinc-200">{children}</ol>;
          },
          // Proper paragraph spacing
          p({ children }) {
            return <p className="mb-5 last:mb-0">{children}</p>;
          },
          // Vibrant Headers
          h1({ children }) { return <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>; },
          h2({ children }) { return <h2 className="text-xl font-bold text-white mt-8 mb-4">{children}</h2>; },
          h3({ children }) { return <h3 className="text-lg font-bold text-white mt-6 mb-3">{children}</h3>; },
        }}
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  );
};

export default function TutorPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages]);

  const handleAskQuestion = async () => {
    if (!input.trim()) return;

    const userQuestion = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuestion }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userQuestion, context: "" }),
      });

      if (!response.ok) throw new Error("Backend error");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I lost connection to the backend. Is FastAPI running on port 8000?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
      </div>

      {/* --- MAIN CHAT AREA (HYBRID STYLE) --- */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10">
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-20">
              <Bot className="w-16 h-16 text-violet-500/40 mb-6 drop-shadow-xl" />
              <h3 className="text-2xl font-medium mb-3 text-zinc-200">How can I help you today?</h3>
              <p className="text-zinc-500 max-w-md text-[15px] leading-7">
                Ask a question about any IBPS SO topic, or ask me to explain a complex concept in plain English.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isLatestAssistantMessage = msg.role === "assistant" && idx === messages.length - 1;
              const isUser = msg.role === "user";
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-5"
                >
                  {/* Left Avatar */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                      isUser ? "bg-zinc-800 border border-zinc-700" : "bg-gradient-to-br from-violet-600 to-fuchsia-600 border border-violet-500/50"
                    }`}
                  >
                    {isUser ? <User className="w-5 h-5 text-zinc-400" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  
                  {/* Right Content */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="font-semibold text-[13px] text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {isUser ? "You" : "AI Tutor"}
                    </span>
                    
                    {isUser ? (
                      <div className="text-[15px] leading-7 text-zinc-200 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    ) : (
                      <AnimatedMarkdown content={msg.content} isLatest={isLatestAssistantMessage} />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md border border-violet-500/50">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <span className="font-semibold text-[13px] text-zinc-500 mb-2 uppercase tracking-wider">AI Tutor</span>
                <div className="flex gap-1.5 items-center mt-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* --- INPUT BOX --- */}
      <div className="p-6 bg-[#09090b] shrink-0 border-t border-white/5">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
          <div className="relative flex items-end bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion();
                }
              }}
              placeholder="Ask your doubt..."
              className="w-full bg-transparent max-h-32 min-h-[56px] py-4 pl-5 pr-14 text-zinc-200 text-[15px] focus:outline-none resize-none placeholder:text-zinc-600"
              rows={1}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-all shadow-lg disabled:opacity-50 disabled:hover:bg-violet-600 disabled:shadow-none"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          <div className="text-center mt-3">
            <span className="text-[11px] text-zinc-600 font-medium tracking-wide uppercase">AI Tutor can make mistakes. Verify important info.</span>
          </div>
        </div>
      </div>
    </div>
  );
}