import { Skeleton } from "@/components/ui/Skeleton";

export default function PracticeLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-44" />
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  );
}
