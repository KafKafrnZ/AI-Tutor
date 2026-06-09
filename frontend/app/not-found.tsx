import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-6xl font-black text-white mb-2">404</h1>
        <h2 className="text-xl font-bold text-zinc-300 mb-3">Page not found</h2>
        <p className="text-zinc-500 mb-8">
          This page doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
