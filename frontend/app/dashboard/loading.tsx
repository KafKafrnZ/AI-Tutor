import { SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
