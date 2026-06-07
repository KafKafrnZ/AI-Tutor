"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { API_URL, apiConnectionErrorMessage, readApiError } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("userName", data.name);
        toast.success("Login successful!");
        router.push("/dashboard");
      } else if (response.status === 403) {
        toast.error("Email not verified. Please check your inbox.", { duration: 6000 });
      } else {
        const message = await readApiError(response, "Invalid credentials. Please try again.");
        toast.error(message);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(apiConnectionErrorMessage());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient violet radial glow in background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors z-10">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Card with pulsating violet glow */}
      <div className="relative w-full max-w-md animate-pulse-glow-violet bg-zinc-900/60 border border-violet-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10">
        {/* Top badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Returning User
          </span>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-900/30">
            <KeyRound className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-zinc-400 text-sm mt-1 text-center">Sign in to continue your government exam preparation.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl py-3 mt-6 transition-all disabled:opacity-40 flex justify-center items-center gap-2 shadow-lg shadow-violet-900/40"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Sign up
          </Link>
        </p>
        <p className="text-center text-zinc-600 text-sm mt-2">
          <Link href="/forgot-password" className="hover:text-zinc-400 transition-colors">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
