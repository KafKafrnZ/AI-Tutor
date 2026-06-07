export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 ${className ?? ""}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="p-5 bg-zinc-950/50 border border-white/5 rounded-xl space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
