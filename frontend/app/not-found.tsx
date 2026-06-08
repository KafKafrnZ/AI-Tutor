import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-violet-400 text-sm font-medium tracking-widest uppercase">404</p>
        <h1 className="text-4xl font-bold">Page Not Found</h1>
        <p className="text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
