import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div aria-label="Loading settings" aria-busy="true">
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
