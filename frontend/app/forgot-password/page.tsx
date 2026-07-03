"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import VideoBackground from "@/components/VideoBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // show same message regardless — prevent enumeration
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg p-4 text-fg">
      <VideoBackground posterSrc="/media/auth-bg.jpg" />
      <Link
        href="/login"
        className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition-colors hover:text-white sm:left-8 sm:top-8"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Access Deck</span>
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-primary/20 bg-surface/70 p-8 shadow-2xl shadow-primary/10 backdrop-blur-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 border border-primary/25">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Night City Recovery</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Rebuild Access Shard</h2>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Enter your access ID and we&apos;ll transmit a reset shard.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p role="alert" aria-live="polite" className="text-accent-progress font-medium">
              If that access ID exists, a reset shard has been sent.
            </p>
            <p className="text-zinc-500 text-sm">
              During development, check the backend server logs for the recovery token.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors text-sm"
            >
              Back to Access Deck
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Access ID
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-white text-black font-semibold rounded-xl py-3 mt-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Transmit Reset Shard"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
