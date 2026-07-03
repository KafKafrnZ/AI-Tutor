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
    eyebrow: "Neural access",
    title: "Jack back in",
    body: "Reconnect to your tutor core, arena history, and active exam contracts.",
    cta: "Breach account",
  },
  signup: {
    eyebrow: "Ripperdoc install",
    title: "Install Ascend firmware",
    body: "Create a guided study deck with adaptive drills, bonfire trials, and mistake intel.",
    cta: "Install account",
  },
};

const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Must contain at least one digit.";
  return null;
};

export default function AuthCard({ initialMode = "signin", apiBaseUrl, onSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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
    setPasswordError("");
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setPasswordError("");

    if (mode === "signup") {
      const pwdError = validatePassword(password);
      if (pwdError) {
        setPasswordError(pwdError);
        return;
      }
    }

    setIsLoading(true);

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
            {item === "signin" ? "Jack in" : "Install"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label htmlFor="auth-name" className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Call sign</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Operator name"
                className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </label>
        )}

        <label htmlFor="auth-email" className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">Access ID</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="operator@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </label>

        <label htmlFor="auth-password" className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">Passphrase</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Secure passphrase" : "8+ chars, 1 uppercase, 1 digit"}
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
                    className={cn("h-1.5 rounded-full transition-colors", rule.met ? "bg-accent-progress" : "bg-zinc-700")}
                  />
                ))}
              </div>
              {firstUnmetPasswordRule && (
                <p className="text-xs text-zinc-400">{firstUnmetPasswordRule.hint}</p>
              )}
              {passwordError && <p className="mt-0.5 text-xs text-accent-mock">{passwordError}</p>}
            </div>
          )}
        </label>

        {error && (
          <div role="alert" aria-live="polite" className="flex gap-2 rounded-xl border border-accent-mock/25 bg-accent-mock/10 p-3 text-sm text-accent-mock">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent-mock" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-bg shadow-lg shadow-primary/20 transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading && <Loader2 className="size-5 animate-spin" />}
          {selectedCopy.cta}
        </button>
      </form>

      {mode === "signin" ? (
        <p className="mt-5 text-center text-sm text-zinc-500">
          Lost your access shard?{" "}
          <Link href="/forgot-password" className="font-medium text-primary transition-colors hover:text-primary">
            Rebuild it
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-zinc-500">
          Firmware already installed?{" "}
          <button type="button" onClick={() => selectMode("signin")} className="font-medium text-primary transition-colors hover:text-primary">
            Jack in
          </button>
        </p>
      )}
    </section>
  );
}
