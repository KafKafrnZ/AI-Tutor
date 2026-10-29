"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickyScrollProps {
  content: {
    title: string;
    description: ReactNode;
    visual: ReactNode;
  }[];
  className?: string;
}

function StickyVisual({
  index,
  activeIndex,
  visual,
}: {
  index: number;
  activeIndex: MotionValue<number>;
  visual: ReactNode;
}) {
  const opacity = useTransform(activeIndex, (value) => (Math.round(value) === index ? 1 : 0));
  const scale = useTransform(activeIndex, (value) => (Math.round(value) === index ? 1 : 0.94));
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-8 lg:p-12"
      style={{ opacity, scale, pointerEvents: "none" }}
    >
      {visual}
    </motion.div>
  );
}

function StackedMissions({ content }: { content: StickyScrollProps["content"] }) {
  return (
    <div className="flex flex-col gap-16 px-6 py-4">
      {content.map((item) => (
        <div key={item.title} className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-fg">{item.title}</h2>
            <div className="text-base leading-relaxed text-zinc-400">{item.description}</div>
          </div>
          {item.visual}
        </div>
      ))}
    </div>
  );
}

export function StickyScroll({ content, className }: StickyScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const activeIndex = useTransform(scrollYProgress, (value) =>
    Math.min(Math.floor(value * content.length), content.length - 1),
  );

  return (
    <div className={cn("relative", className)}>
      <div className="block md:hidden motion-reduce:!block">
        <StackedMissions content={content} />
      </div>

      <div
        ref={containerRef}
        className="relative hidden md:flex motion-reduce:!hidden"
        style={{ minHeight: `${Math.max(content.length, 1) * 100}vh` }}
      >
        <div className="relative flex w-1/2 flex-col items-start justify-start">
          {content.map((item) => (
            <div key={item.title} className="flex h-screen items-center justify-center p-10 lg:p-16">
              <div className="max-w-md">
                <h2 className="mb-4 text-4xl font-bold text-fg">{item.title}</h2>
                <div className="text-lg leading-relaxed text-zinc-400">{item.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky top-0 flex h-screen w-1/2 items-center justify-center overflow-hidden">
          {content.map((item, index) => (
            <StickyVisual key={item.title} index={index} activeIndex={activeIndex} visual={item.visual} />
          ))}
        </div>
      </div>
    </div>
  );
}
