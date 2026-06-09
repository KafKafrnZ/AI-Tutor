import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function ProgressLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}
