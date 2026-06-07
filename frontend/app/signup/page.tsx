"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { API_URL, apiConnectionErrorMessage, readApiError } from "@/lib/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Account created! You can sign in now.");
        router.push("/login");
      } else {
        const message = await readApiError(response, "Signup failed. Try a different email.");
        toast.error(message);
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(apiConnectionErrorMessage());
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("ascend-ai join --free");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient teal radial glow in background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[120px]" />
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors z-10">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="relative w-full max-w-md bg-zinc-900/60 border border-teal-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10">
        {/* Top badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold px-3 py-1 rounded-full tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            New Account
          </span>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-900/30">
            <UserPlus className="w-7 h-7 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create an account</h2>
          <p className="text-zinc-400 text-sm mt-1 text-center">Start your Ascend AI journey today.</p>
        </div>

        {/* Grok-style terminal decoration with pulsating teal glow */}
        <div className="animate-pulse-glow-teal mb-6 bg-zinc-950 border border-teal-500/25 rounded-xl p-4 font-mono text-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500/70" />
            </div>
            <button
              onClick={handleCopy}
              className="text-zinc-500 hover:text-teal-400 transition-colors"
              type="button"
              aria-label="Copy command"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-zinc-500 text-xs mb-1">PowerShell</p>
          <p className="text-teal-400">
            ascend-ai <span className="text-white">join</span>{" "}
            <span className="text-zinc-400">--free</span>
          </p>
          <p className="text-zinc-600 text-xs mt-2">&gt; Initializing your AI study environment...</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ chars, 1 uppercase, 1 digit"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !email || !password}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl py-3 mt-4 transition-all disabled:opacity-40 flex justify-center items-center gap-2 shadow-lg shadow-teal-900/40"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
