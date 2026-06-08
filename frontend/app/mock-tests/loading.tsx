import { SkeletonCard } from "@/components/ui/Skeleton";

export default function MockTestsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-white/5" />
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
