import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 h-48 space-y-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-48" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-24" />)}
            </div>
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
