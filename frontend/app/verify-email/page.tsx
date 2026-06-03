"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bot, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing. Please use the link from your email.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully.");
        } else {
          setStatus("error");
          setMessage(data.detail || "This link is invalid or has expired. Please sign up again or request a new link.");
        }
      } catch {
        setStatus("error");
        setMessage("Cannot connect to server. Please try again.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-violet-900/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Email Verification</h2>
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-zinc-400">Verifying your email address…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <div className="space-y-1">
              <p className="text-emerald-400 font-semibold text-lg">Verified!</p>
              <p className="text-zinc-400 text-sm">{message}</p>
            </div>
            <Link
              href="/login"
              className="w-full bg-white text-black font-semibold rounded-xl py-3 hover:bg-zinc-200 transition-colors text-center block"
            >
              Continue to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-rose-400" />
            <div className="space-y-1">
              <p className="text-rose-400 font-semibold text-lg">Verification Failed</p>
              <p className="text-zinc-400 text-sm">{message}</p>
            </div>
            <Link
              href="/signup"
              className="w-full bg-white text-black font-semibold rounded-xl py-3 hover:bg-zinc-200 transition-colors text-center block"
            >
              Back to Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading…</span>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
