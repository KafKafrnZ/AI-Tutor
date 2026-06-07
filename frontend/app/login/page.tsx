"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import AuthCard, { type AuthMode } from "@/components/auth/AuthCard";
import VideoBackground from "@/components/VideoBackground";

function readUserName(data: unknown): string {
  if (data && typeof data === "object" && "name" in data) {
    const name = (data as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? name : "Student";
  }

  return "Student";
}

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = (data: unknown, mode: AuthMode) => {
    if (mode === "signup") {
      toast.success("Account created. You can sign in now.");
      return;
    }

    localStorage.setItem("userName", readUserName(data));
    toast.success("Login successful.");
    router.push("/dashboard");
  };

  return (
    <main className="relative flex min-h-dvh overflow-hidden bg-bg px-4 py-8 text-fg">
      <VideoBackground posterSrc="/media/auth-bg.jpg" priority />

      <Link href="/" className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-xl transition-colors hover:text-white sm:left-8 sm:top-8">
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-center pt-14">
        <AuthCard initialMode="signin" onSuccess={handleSuccess} />
      </div>
    </main>
  );
}
