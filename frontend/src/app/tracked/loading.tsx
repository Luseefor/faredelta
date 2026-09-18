import { Skeleton } from "@/components/ui/skeleton";

export default function TrackedLoading() {
  return (
    <div className="space-y-6" aria-label="Loading watchlist" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => <Skeleton key={item} className="h-72 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
