import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl" | "max-w-7xl" | "max-w-full";
}

export function PageShell({ children, className = "", maxWidth = "max-w-5xl" }: PageShellProps) {
  return (
    <div className={`min-h-screen bg-bg text-fg p-4 md:p-8 relative z-10 w-full ${className}`}>
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`${maxWidth} mx-auto w-full`}
      >
        {children}
      </motion.div>
    </div>
  );
}
