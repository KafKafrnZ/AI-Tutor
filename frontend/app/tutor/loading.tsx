import { Skeleton } from "@/components/ui/Skeleton";

export default function TutorLoading() {
  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="flex-1 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-16 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
