"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Command, Flame, Gauge, Sparkles } from "lucide-react";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { getTheme, type GameUniverse, type UniverseTheme } from "@/components/game/universes";

type ThemeLike = GameUniverse | UniverseTheme;

function resolveTheme(theme?: ThemeLike) {
  return typeof theme === "string" || !theme ? getTheme(theme) : theme;
}

export function GameAtmosphere({ universe = "neuro", intensity = "normal" }: { universe?: ThemeLike; intensity?: "quiet" | "normal" | "loud" }) {
  const theme = resolveTheme(universe);
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", intensity === "quiet" ? "opacity-45" : intensity === "loud" ? "opacity-90" : "opacity-70")}>
      <div className={cn("absolute inset-0 game-grid", `game-${theme.id}`)} />
      <div className={cn("absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-3xl", theme.bgClass)} />
      <div className={cn("absolute -right-24 bottom-1/4 h-80 w-80 rounded-full blur-3xl", theme.bgClass)} />
      <div className="absolute inset-0 game-scanlines" />
    </div>
  );
}

export function GameCard({
  children,
  universe = "neuro",
  className,
  interactive = false,
  ...props
}: ComponentPropsWithoutRef<typeof motion.div> & { children: ReactNode; universe?: ThemeLike; interactive?: boolean }) {
  const theme = resolveTheme(universe);
  return (
    <motion.div
      whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.18 }}
      className={cn(
        "game-card relative overflow-hidden rounded-[var(--radius-token)] border bg-surface/55 shadow-2xl shadow-black/25 backdrop-blur-2xl",
        theme.borderClass,
        interactive && "group cursor-pointer",
        className
      )}
      {...props}
    >
      <div className={cn("absolute inset-x-0 top-0 h-px", theme.bgClass)} />
      {interactive && <div className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-[120%] group-hover:opacity-100" />}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function GameButton({
  children,
  universe = "neuro",
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { children: ReactNode; universe?: ThemeLike; variant?: "primary" | "ghost" | "danger" }) {
  const theme = resolveTheme(universe);
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-token)] px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45",
        theme.ringClass,
        variant === "primary" && cn("border text-bg shadow-lg", theme.bgClass, theme.borderClass, theme.accentClass),
        variant === "ghost" && cn("border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10", theme.borderClass),
        variant === "danger" && "border border-accent-mock/30 bg-accent-mock/10 text-accent-mock hover:bg-accent-mock/15",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GameLinkButton({
  href,
  children,
  universe = "neuro",
  className,
}: {
  href: string;
  children: ReactNode;
  universe?: ThemeLike;
  className?: string;
}) {
  const theme = resolveTheme(universe);
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-token)] border px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2",
        theme.bgClass,
        theme.borderClass,
        theme.accentClass,
        theme.ringClass,
        className
      )}
    >
      {children}
      <ChevronRight className="size-4" />
    </Link>
  );
}

export function HudBar({ userName = "Student", plan = "free", universe = "neuro" }: { userName?: string; plan?: string; universe?: ThemeLike }) {
  const theme = resolveTheme(universe);
  const Icon = theme.icon;
  return (
    <div className="sticky top-0 z-30 hidden border-b border-white/10 bg-bg/72 px-5 py-3 backdrop-blur-2xl md:block">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex size-10 items-center justify-center rounded-[var(--radius-token)] border", theme.bgClass, theme.borderClass)}>
            <Icon className={cn("size-5", theme.accentClass)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">{theme.eyebrow}</p>
            <p className="truncate text-sm font-semibold text-zinc-100">{theme.signal}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-[var(--radius-token)] border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex items-center gap-1 text-zinc-500"><Gauge className="size-3" /> Level</span>
            <p className="font-bold text-white">07</p>
          </div>
          <div className="rounded-[var(--radius-token)] border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex items-center gap-1 text-zinc-500"><Flame className="size-3" /> Streak</span>
            <p className="font-bold text-white">Active</p>
          </div>
          <div className="rounded-[var(--radius-token)] border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex items-center gap-1 text-zinc-500"><Command className="size-3" /> Companion</span>
            <p className={cn("font-bold", theme.accentClass)}>{userName || plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteLoading({ universe = "neuro", title }: { universe?: ThemeLike; title?: string }) {
  const theme = resolveTheme(universe);
  const Icon = theme.icon;
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6 text-center text-fg">
      <GameAtmosphere universe={theme} />
      <GameCard universe={theme} className="max-w-md p-8">
        <div className={cn("mx-auto mb-5 flex size-16 items-center justify-center rounded-[var(--radius-token)] border", theme.bgClass, theme.borderClass)}>
          <Icon className={cn("size-8 animate-pulse", theme.accentClass)} />
        </div>
        <p className={cn("text-xs font-bold uppercase tracking-[0.24em]", theme.accentClass)}>{theme.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white">{title || theme.loading}</h1>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className={cn("h-1.5 rounded-full", theme.bgClass)} />
          ))}
        </div>
      </GameCard>
    </div>
  );
}

export function InWorldState({
  universe = "neuro",
  title,
  body,
  action,
}: {
  universe?: ThemeLike;
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  const theme = resolveTheme(universe);
  const Icon = theme.icon;
  return (
    <GameCard universe={theme} className="p-8 text-center">
      <div className={cn("mx-auto mb-5 flex size-16 items-center justify-center rounded-[var(--radius-token)] border", theme.bgClass, theme.borderClass)}>
        <Icon className={cn("size-8", theme.accentClass)} />
      </div>
      <p className={cn("text-xs font-bold uppercase tracking-[0.22em]", theme.accentClass)}>{theme.label}</p>
      <h2 className="mt-2 text-xl font-black text-white">{title || theme.empty}</h2>
      {body && <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </GameCard>
  );
}

export function QuestToastSkin({ children, universe = "neuro" }: { children: ReactNode; universe?: ThemeLike }) {
  const theme = resolveTheme(universe);
  return (
    <div className={cn("rounded-[var(--radius-token)] border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl", theme.bgClass, theme.borderClass, theme.accentClass)}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4" />
        {children}
      </div>
    </div>
  );
}
