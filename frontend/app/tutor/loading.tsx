import { Skeleton } from "@/components/ui/Skeleton";

export default function TutorLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col h-[calc(100vh-80px)]">
      <Skeleton className="h-8 w-36 mb-6" />
      <div className="flex-1 space-y-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : ""}`}>
            <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-3/4"}`} />
          </div>
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl mt-4" />
    </div>
  );
}
