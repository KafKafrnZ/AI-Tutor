"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, Bot, Target, FileText, TrendingUp,
  ShieldCheck, ArrowRight, Server, GraduationCap,
} from "lucide-react";
import Logo from "@/components/Logo";
import VideoBackground from "@/components/VideoBackground";

const capabilities = [
  {
    icon: Bot,
    title: "AI tutor with visual explanations",
    body: "Ask anything from the syllabus. Ascend explains step by step — with diagrams and charts, not just walls of text — and cites where the answer comes from.",
  },
  {
    icon: FileText,
    title: "Exam-grade mock tests",
    body: "Full-length, sectioned mocks modelled on the real UPSC & State PSC pattern — timed, negatively marked, and evaluated the moment you submit.",
  },
  {
    icon: Target,
    title: "Adaptive practice",
    body: "Ascend learns your weak areas from every attempt and drills them, so you spend time on what actually moves your score.",
  },
  {
    icon: TrendingUp,
    title: "Progress & mistake analytics",
    body: "A mistake locker and progress dashboard track every error and trend, turning scattered weak spots into a clear study plan.",
  },
];

const enterprisePoints = [
  { icon: Server, title: "Self-hostable", body: "Run the entire stack on your own infrastructure. No vendor lock-in, no per-query API bill." },
  { icon: GraduationCap, title: "Open-source core", body: "Built on a permissively-licensed open model and RAG pipeline you fully own and control." },
  { icon: ShieldCheck, title: "Your data, grounded", body: "Answers are RAG-grounded in your own question bank — and every answer cites its source." },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-bg font-sans text-white">
      {/* ---------- Top navigation ---------- */}
      <header className="absolute inset-x-0 top-0 z-30">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-9 text-primary drop-shadow-[0_0_18px_rgba(0,212,255,0.45)]" />
            <span className="text-lg font-bold tracking-tight">Ascend AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
              Log in
            </Link>
            <Link href="/signup">
              <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                Get started
              </button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-[92dvh] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32">
        <VideoBackground posterSrc="/media/hero-still.jpg" priority />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex max-w-4xl flex-col items-center px-2 text-center"
        >
          <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-zinc-300 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-primary" />
            Open-source · Self-hostable · RAG-powered
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl">
            Ascend India&apos;s toughest <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              government exams.
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            An AI tutor built for UPSC &amp; State PSC. Ascend pinpoints your weak
            areas, generates exam-grade mock tests, and explains every answer with
            diagrams and citations — so you stop guessing what to study.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/signup">
              <button className="flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition-all hover:bg-zinc-200">
                Start preparing free <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/10">
                View dashboard
              </button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            No credit card needed · Open-source core · Your data stays yours
          </p>
        </motion.div>
      </section>

      {/* ---------- Capabilities (clean) ---------- */}
      <section className="relative z-10 border-t border-white/5 bg-[#09090b] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to clear the exam.
            </h2>
            <p className="text-lg text-zinc-400">
              One system that tutors, tests, and tracks — purpose-built for the
              UPSC &amp; State PSC syllabus.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-violet-500/20 hover:bg-white/[0.04]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 ring-1 ring-violet-500/20">
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">{c.title}</h3>
                  <p className="leading-relaxed text-zinc-400">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Enterprise / open-source strip ---------- */}
      <section className="relative z-10 border-t border-white/5 bg-gradient-to-b from-[#09090b] to-[#0c0a14] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Own the whole system.
            </h2>
            <p className="text-lg text-zinc-400">
              Ascend is built to be deployed and owned — not rented. Ideal for
              institutes and enterprises that need control over their data and stack.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {enterprisePoints.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-600/10 ring-1 ring-fuchsia-500/20">
                    <Icon className="h-6 w-6 text-fuchsia-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Footer CTA ---------- */}
      <section className="relative z-10 border-t border-white/5 bg-[#0c0a14] px-6 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="mb-6 text-4xl font-extrabold tracking-tight md:text-5xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              ascend?
            </span>
          </h2>
          <p className="mb-10 max-w-xl text-lg text-zinc-400">
            Start with UPSC &amp; State PSC today. More government exams are on the way.
          </p>
          <Link href="/signup">
            <button className="flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition-all hover:bg-zinc-200">
              Create your free account <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}
