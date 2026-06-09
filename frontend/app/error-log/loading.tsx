import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function ErrorLogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}
