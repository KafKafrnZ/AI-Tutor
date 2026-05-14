"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#09090b] overflow-hidden flex flex-col items-center justify-center text-white">
      
      {/* --- PULSATING BACKGROUND EFFECTS --- */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] -z-10"
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] -z-10"
      />

      {/* --- TOP NAVBAR --- */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-10 max-w-7xl">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          IBPS SO AI
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-sm font-medium hover:text-white text-zinc-400 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-all">
            Sign up
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="max-w-4xl text-center z-10 px-4 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Master Your Exam with <br /> Intelligent AI Tutoring.
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light">
            Stop guessing what to study. Our AI analyzes your weak points, generates custom mock tests, and provides real-time evaluations to guarantee your success.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link href="/signup" className="flex items-center justify-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-violet-700 transition-colors">
            Start Learning Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/dashboard" className="flex items-center justify-center px-8 py-4 rounded-full font-medium text-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
            View Dashboard
          </Link>
        </motion.div>
      </div>

      {/* --- FEATURES GRID --- */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-24 px-4 z-10"
      >
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <Bot className="w-10 h-10 mb-4 text-violet-400" />
          <h3 className="text-lg font-semibold mb-2">Adaptive RAG Tutor</h3>
          <p className="text-zinc-400 text-sm">Real-time answers strictly based on previous year questions.</p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <Zap className="w-10 h-10 mb-4 text-amber-400" />
          <h3 className="text-lg font-semibold mb-2">Dynamic Practice</h3>
          <p className="text-zinc-400 text-sm">Infinite test generation targeting your specific weak areas.</p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
          <ShieldCheck className="w-10 h-10 mb-4 text-emerald-400" />
          <h3 className="text-lg font-semibold mb-2">Smart Evaluation</h3>
          <p className="text-zinc-400 text-sm">Detailed grading pointing out common mistakes and faster methods.</p>
        </div>
      </motion.div>
    </div>
  );
}