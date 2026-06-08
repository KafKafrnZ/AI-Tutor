import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function PracticeLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
