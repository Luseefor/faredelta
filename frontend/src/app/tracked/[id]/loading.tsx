import { Skeleton } from "@/components/ui/skeleton";

export default function TrackedRouteLoading() {
  return (
    <div className="space-y-4" aria-label="Loading route" aria-busy="true">
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
