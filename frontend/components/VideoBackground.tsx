"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type VideoBackgroundProps = {
  posterSrc: string;
  videoSrc?: string;
  webmSrc?: string;
  mobileBreakpoint?: number;
  className?: string;
  priority?: boolean;
};

export default function VideoBackground({
  posterSrc,
  videoSrc,
  webmSrc,
  mobileBreakpoint = 768,
  className,
  priority = false,
}: VideoBackgroundProps) {
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    const viewportQuery = window.matchMedia(`(min-width: ${mobileBreakpoint}px)`);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");

    const updatePreference = () => {
      setShouldPlayVideo(Boolean(videoSrc) && viewportQuery.matches && motionQuery.matches);
    };

    queueMicrotask(updatePreference);
    viewportQuery.addEventListener("change", updatePreference);
    motionQuery.addEventListener("change", updatePreference);

    return () => {
      viewportQuery.removeEventListener("change", updatePreference);
      motionQuery.removeEventListener("change", updatePreference);
    };
  }, [mobileBreakpoint, videoSrc]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-bg", className)} aria-hidden="true">
      <Image
        src={posterSrc}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover"
      />
      {shouldPlayVideo && videoSrc && (
        <video
          className="absolute inset-0 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={posterSrc}
        >
          {webmSrc && <source src={webmSrc} type="video/webm" />}
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,16,0.94)_0%,rgba(5,8,16,0.70)_48%,rgba(5,8,16,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,212,255,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(5,8,16,0.98),transparent_52%)]" />
    </div>
  );
}
