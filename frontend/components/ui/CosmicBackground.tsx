"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Meteor = { id: number; top: number; left: number; delay: number; duration: number };

function createMeteors(count: number): Meteor[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    top: Math.random() * 100 - 20,
    left: Math.random() * 150 - 50,
    delay: Math.random() * 5,
    duration: Math.random() * 2 + 2,
  }));
}

export default function CosmicBackground() {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    queueMicrotask(() => setMeteors(createMeteors(30)));
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen z-0 overflow-hidden bg-[#020204] pointer-events-none">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-[#020204] to-[#020204]"></div>
      
      {meteors.map((m) => (
        <span
          key={m.id}
          className="animate-shooting-star absolute h-0.5 w-0 bg-gradient-to-r from-transparent via-accent-practice to-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ top: `${m.top}%`, left: `${m.left}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full blur-[2px]" />
        </span>
      ))}

      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] flex items-center justify-center"
      >
        <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border-[40px] border-accent-practice/30 border-t-accent-practice/80 border-b-accent-mock/60 rounded-full blur-xl animate-blackhole-disk mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border-[20px] border-accent-practice/40 border-r-primary/90 rounded-full blur-md animate-blackhole-disk mix-blend-screen" style={{ animationDirection: 'reverse', animationDuration: '8s' }} />
        <div className="absolute w-[220px] h-[220px] bg-accent-mock/40 rounded-full blur-2xl animate-pulse" />
        <div className="absolute w-[180px] h-[180px] bg-accent-practice/50 rounded-full blur-xl" />
        <div className="absolute w-[150px] h-[150px] bg-black rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,1),_0_0_30px_rgba(0,0,0,1)] z-10" />
      </motion.div>

    </div>
  );
}
