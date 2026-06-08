"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail, User } from "lucide-react";

import { API_URL, apiConnectionErrorMessage, readApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

export type AuthMode = "signin" | "signup";

type AuthCardProps = {
  initialMode?: AuthMode;
  apiBaseUrl?: string;
  onSuccess?: (data: unknown, mode: AuthMode) => void;
};

const copy = {
  signin: {
    eyebrow: "Returning user",
    title: "Welcome back",
    body: "Continue your exam preparation with your AI tutor, practice history, and progress plan.",
    cta: "Sign in",
  },
  signup: {
    eyebrow: "New account",
    title: "Create your account",
    body: "Start a guided study workspace with adaptive practice, mock tests, and mistake tracking.",
    cta: "Create account",
  },
};

export default function AuthCard({ initialMode = "signin", apiBaseUrl, onSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedCopy = copy[mode];
  const baseUrl = (apiBaseUrl ?? API_URL).replace(/\/$/, "");
  const canSubmit = mode === "signin" ? Boolean(email && password) : Boolean(name.trim() && email && password);
  const passwordRules = [
    { met: password.length >= 8, hint: "Use at least 8 characters." },
    { met: /[A-Z]/.test(password), hint: "Add an uppercase letter." },
    { met: /\d/.test(password), hint: "Add a digit." },
    { met: /[^A-Za-z0-9]/.test(password), hint: "Add a special character." },
  ];
  const firstUnmetPasswordRule = passwordRules.find((rule) => !rule.met);
  const showPasswordStrength = mode === "signup" && (isPasswordFocused || password.length > 0);

  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${baseUrl}/${mode === "signin" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          mode === "signin"
            ? { email, password }
            : { name: name.trim(), email, password }
        ),
      });

      if (!response.ok) {
        const fallback =
          response.status === 403
            ? "Email not verified. Please check your inbox."
            : mode === "signin"
              ? "Invalid credentials. Please try again."
              : "Signup failed. Try a different email.";
        setError(await readApiError(response, fallback));
        return;
      }

      const data = await response.json();
      if (mode === "signup") {
        setMode("signin");
        setPassword("");
      }
      onSuccess?.(data, mode);
    } catch (submitError) {
      console.error("Auth submit failed", submitError);
      setError(apiConnectionErrorMessage());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full max-w-md animate-fade-up rounded-[var(--radius-token)] border border-primary/20 bg-surface/70 p-7 text-fg shadow-2xl shadow-primary/10 backdrop-blur-2xl sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_28px_rgba(0,212,255,0.18)]">
            <Logo className="size-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{selectedCopy.eyebrow}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">{selectedCopy.title}</h1>
          </div>
        </div>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-zinc-400">{selectedCopy.body}</p>

      <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1" role="tablist" aria-label="Authentication mode">
        {(["signin", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => selectMode(item)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              mode === item ? "bg-primary text-bg" : "text-zinc-400 hover:text-white"
            )}
          >
            {item === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label htmlFor="auth-name" className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">Name</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </label>
        )}

        <label htmlFor="auth-email" className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </label>

        <label htmlFor="auth-password" className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Your password" : "8+ chars, 1 uppercase, 1 digit"}
              className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-12 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition-colors hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {showPasswordStrength && (
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-4 gap-1.5">
                {passwordRules.map((rule, index) => (
                  <div
                    key={index}
                    className={cn("h-1.5 rounded-full transition-colors", rule.met ? "bg-emerald-400" : "bg-zinc-700")}
                  />
                ))}
              </div>
              {firstUnmetPasswordRule && (
                <p className="text-xs text-zinc-400">{firstUnmetPasswordRule.hint}</p>
              )}
            </div>
          )}
        </label>

        {error && (
          <div role="alert" aria-live="polite" className="flex gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-300" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-bg shadow-lg shadow-primary/20 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading && <Loader2 className="size-5 animate-spin" />}
          {selectedCopy.cta}
        </button>
      </form>

      {mode === "signin" ? (
        <p className="mt-5 text-center text-sm text-zinc-500">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-medium text-primary transition-colors hover:text-cyan-200">
            Reset it
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <button type="button" onClick={() => selectMode("signin")} className="font-medium text-primary transition-colors hover:text-cyan-200">
            Sign in
          </button>
        </p>
      )}
    </section>
  );
}
