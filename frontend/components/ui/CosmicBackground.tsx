"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Meteor = { id: number; top: number; left: number; delay: number; duration: number };

function createMeteors(count: number): Meteor[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    top: ((i * 17) % 100) - 20,
    left: ((i * 29) % 150) - 50,
    delay: (i % 7) * 0.7,
    duration: 2 + (i % 5) * 0.4,
  }));
}

export default function CosmicBackground() {
  const reduceMotion = useReducedMotion();
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    if (reduceMotion) return;
    queueMicrotask(() => setMeteors(createMeteors(18)));
  }, [reduceMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--ascend-primary),0.2),rgb(var(--ascend-bg))_55%)]" />

      {meteors.map((m) => (
        <span
          key={m.id}
          className="animate-shooting-star absolute h-0.5 w-0 rounded-full bg-gradient-to-r from-transparent via-accent-practice to-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ top: `${m.top}%`, left: `${m.left}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
        >
          <div className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white blur-[2px]" />
        </span>
      ))}

      <motion.div
        initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 2.4, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 flex h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        <div className={`absolute left-1/2 top-1/2 h-[800px] w-[800px] rounded-full border-[40px] border-accent-practice/30 border-b-accent-mock/60 border-t-accent-practice/80 blur-xl mix-blend-screen ${reduceMotion ? "" : "animate-blackhole-disk"}`} />
        <div
          className={`absolute left-1/2 top-1/2 h-[600px] w-[600px] rounded-full border-[20px] border-accent-practice/40 border-r-primary/90 blur-md mix-blend-screen ${reduceMotion ? "" : "animate-blackhole-disk"}`}
          style={reduceMotion ? undefined : { animationDirection: "reverse", animationDuration: "8s" }}
        />
        <div className={`absolute h-[220px] w-[220px] rounded-full bg-accent-mock/40 blur-2xl ${reduceMotion ? "" : "animate-pulse"}`} />
        <div className="absolute h-[180px] w-[180px] rounded-full bg-accent-practice/50 blur-xl" />
        <div className="absolute z-10 h-[150px] w-[150px] rounded-full bg-black shadow-[inset_0_0_20px_rgba(0,0,0,1),_0_0_30px_rgba(0,0,0,1)]" />
      </motion.div>
    </div>
  );
}
