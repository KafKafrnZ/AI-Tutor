import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode, MouseEvent } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function GlassCard({ children, className = "", interactive = false, ...props }: GlassCardProps) {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className={`relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden ${interactive ? 'group cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {interactive && (
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
          style={{ background: `radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)` }} 
        />
      )}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
}
