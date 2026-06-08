import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";

export default function ProgressLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="h-8 w-36 animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
