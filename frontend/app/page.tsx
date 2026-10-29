"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  Sparkles, Bot, Target, FileText, TrendingUp,
  ShieldCheck, ArrowRight, Server, GraduationCap,
} from "lucide-react";
import Logo from "@/components/Logo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { StickyScroll } from "@/components/ui/StickyScroll";
import { GlassCard } from "@/components/layout/GlassCard";
import CosmicBackground from "@/components/ui/CosmicBackground";

const capabilities = [
  {
    title: "Tutor Core",
    description: "Portal-grade explanations grounded in PYQ context. The chamber streams citations from past exams so every answer stays anchored in the paper, not vibes.",
    visual: (
      <GlassCard className="relative flex h-[340px] w-full flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-transparent to-transparent p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] md:h-[400px]">
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
        <Bot className="relative z-10 mb-6 h-24 w-24 text-primary drop-shadow-[0_0_15px_rgba(0,212,255,0.8)] md:h-28 md:w-28" />
        <p className="relative z-10 text-center text-xl font-bold text-fg md:text-2xl">Streaming LLM Interface</p>
      </GlassCard>
    ),
  },
  {
    title: "Arena Drills",
    description: "AI-generated target waves for one topic at a time. Perfect timing and accuracy in a high-pressure drill loop until the weak area stops moving.",
    visual: (
      <GlassCard className="relative flex h-[340px] w-full flex-col items-center justify-center bg-gradient-to-bl from-accent/20 via-transparent to-transparent p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] md:h-[400px]">
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
        <Target className="relative z-10 mb-6 h-24 w-24 text-accent drop-shadow-[0_0_15px_rgba(139,92,246,0.8)] md:h-28 md:w-28" />
        <p className="relative z-10 text-center text-xl font-bold text-fg md:text-2xl">Rapid Fire Accuracy</p>
      </GlassCard>
    ),
  },
  {
    title: "Mock Tests",
    description: "Bonfire trials with negative marking and a precise post-mortem. Same pressure as India's toughest government exams, without wasting a real attempt.",
    visual: (
      <GlassCard className="relative flex h-[340px] w-full flex-col items-center justify-center bg-gradient-to-t from-accent-mock/20 via-transparent to-transparent p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] md:h-[400px]">
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-mock/20 blur-3xl" />
        <FileText className="relative z-10 mb-6 h-24 w-24 text-accent-mock drop-shadow-[0_0_15px_rgba(244,63,113,0.8)] md:h-28 md:w-28" />
        <p className="relative z-10 text-center text-xl font-bold text-fg md:text-2xl">High Stakes Mocks</p>
      </GlassCard>
    ),
  },
  {
    title: "Mistake Ledger",
    description: "Turn error history into contracts. Weak topics get categorized automatically, then sent back to the chamber or the arena until they stop repeating.",
    visual: (
      <GlassCard className="relative flex h-[340px] w-full flex-col items-center justify-center bg-gradient-to-r from-accent-progress/20 via-transparent to-transparent p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] md:h-[400px]">
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-progress/20 blur-3xl" />
        <TrendingUp className="relative z-10 mb-6 h-24 w-24 text-accent-progress drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] md:h-28 md:w-28" />
        <p className="relative z-10 text-center text-xl font-bold text-fg md:text-2xl">Automated Meta-Game</p>
      </GlassCard>
    ),
  },
];

const enterprisePoints = [
  { icon: Server, title: "Self-hostable", body: "Run the entire stack on your own infrastructure. No vendor lock-in, no per-query API bill." },
  { icon: GraduationCap, title: "Open-source core", body: "Built on a permissively-licensed open model and RAG pipeline you fully own and control." },
  { icon: ShieldCheck, title: "Your data, grounded", body: "Answers are RAG-grounded in your own question bank — and every answer cites its source." },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 0.7]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduceMotion ? 1 : 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 180]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent font-sans text-fg">
      <CosmicBackground />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-bg/50 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-9 text-primary drop-shadow-[0_0_18px_rgba(0,212,255,0.45)]" />
            <span className="text-lg font-bold tracking-tight">Ascend AI Neuro-OS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 transition-colors hover:text-fg">
              Jack in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-fg px-6 py-2 text-sm font-semibold text-bg transition-colors hover:bg-zinc-200"
            >
              Install
            </Link>
          </div>
        </nav>
      </header>

      <section ref={heroRef} className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-24">
        <motion.div
          style={reduceMotion ? undefined : { scale: heroScale, opacity: heroOpacity, y: heroY }}
          className="relative flex max-w-5xl flex-col items-center px-2 text-center"
        >
          <div className="mb-10 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary shadow-[0_0_15px_rgba(0,212,255,0.2)] backdrop-blur-xl">
            <Sparkles className="h-4 w-4" />
            Open-source / Self-hostable / RAG-powered
          </div>

          <h1 className="mb-8 text-5xl font-extrabold leading-none tracking-tight drop-shadow-2xl sm:text-6xl md:text-8xl lg:text-[7rem]">
            Jack into India&apos;s <br />
            <span className="bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,212,255,0.3)]">
              toughest exams.
            </span>
          </h1>

          <p className="mb-12 max-w-3xl text-lg leading-relaxed text-zinc-300 drop-shadow-md md:text-2xl">
            A neon study operating system for UPSC, SSC, banking, railways, and state exams. Ascend locks onto weak areas, arms exam-grade trials, and explains every answer with grounded citations.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/signup"
              className="flex min-h-12 items-center gap-2 rounded-full bg-fg px-10 py-4 text-lg font-bold text-bg shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100"
            >
              Breach the syllabus <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex min-h-12 items-center rounded-full border border-fg/20 bg-bg/40 px-10 py-4 text-lg font-bold text-fg shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md transition-colors hover:bg-fg/10"
            >
              Jack into the war room
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="relative z-20 border-t border-white/10 bg-bg/80 py-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl md:py-24">
        <ScrollReveal yOffset={60} className="mx-auto mb-12 max-w-4xl px-6 text-center md:mb-16">
          <h2 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
            Every module feels like <br /><span className="text-primary">a mission.</span>
          </h2>
          <p className="text-lg text-zinc-400 md:text-xl">
            Tutor chambers, arena drills, bonfire mocks, and command analytics: one deck for the full government-exam grind.
          </p>
        </ScrollReveal>

        <StickyScroll content={capabilities} className="border-y border-white/10 bg-black/20" />
      </section>

      <section className="relative z-10 bg-gradient-to-b from-bg to-surface px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal delay={0.1} className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
            <h2 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl">
              Own the whole stack.
            </h2>
            <p className="text-lg text-zinc-400 md:text-xl">
              Ascend is built to be deployed and owned — not rented. Ideal for
              institutes and enterprises that need control over their data.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {enterprisePoints.map((p, i) => {
              const Icon = p.icon;
              return (
                <ScrollReveal key={p.title} delay={0.2 + (i * 0.1)} yOffset={30}>
                  <GlassCard className="h-full p-10 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-accent/30">
                      <Icon className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="mb-4 text-2xl font-bold text-fg">{p.title}</h3>
                    <p className="text-base leading-relaxed text-zinc-400">{p.body}</p>
                  </GlassCard>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden border-t border-white/10 bg-bg px-6 py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--ascend-primary),0.12),transparent_60%)]" />
        <ScrollReveal yOffset={80} className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="mb-8 text-5xl font-extrabold tracking-tight md:text-7xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ascend?
            </span>
          </h2>
          <p className="mb-12 max-w-2xl text-lg text-zinc-400 md:text-xl">
            Start with UPSC & State PSC today. More government exams are on the way.
          </p>
          <Link
            href="/signup"
            className="flex min-h-12 items-center gap-3 rounded-full bg-fg px-10 py-5 text-xl font-extrabold text-bg shadow-2xl shadow-primary/20 transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100"
          >
            Install your free account <ArrowRight className="h-6 w-6" />
          </Link>
        </ScrollReveal>
      </section>
    </main>
  );
}
