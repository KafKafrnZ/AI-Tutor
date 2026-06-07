"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

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
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative">
      <Link
        href="/login"
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Login</span>
      </Link>

      <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-900/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p className="text-emerald-400 font-medium">
              If that email exists, a reset link has been sent.
            </p>
            <p className="text-zinc-500 text-sm">
              During development, check the backend server logs for the reset token.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors text-sm"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-white text-black font-semibold rounded-xl py-3 mt-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
