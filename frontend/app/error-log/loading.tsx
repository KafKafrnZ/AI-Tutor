import { SkeletonRow } from "@/components/ui/Skeleton";

export default function ErrorLogLoading() {
  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-white/5" />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
