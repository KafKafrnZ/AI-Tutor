"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Reset token is missing. Use the link from your email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        let message = data.detail || "Reset failed. The link may have expired.";
        if (Array.isArray(data.detail)) {
          message = data.detail[0]?.msg || message;
        }
        setError(message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-900/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
        <p className="text-zinc-400 text-sm mt-1">Choose a new password for your account.</p>
      </div>

      {success ? (
        <div className="text-center space-y-2">
          <p className="text-emerald-400 font-medium">Password updated successfully!</p>
          <p className="text-zinc-500 text-sm">Redirecting you to login…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="w-full bg-white text-black font-semibold rounded-xl py-3 mt-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative">
      <Link
        href="/login"
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Login</span>
      </Link>
      <Suspense fallback={<div className="text-zinc-400">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
