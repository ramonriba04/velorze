import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Wrapper that announces loading state to assistive tech. */
function LoadingRegion({
  children,
  className,
  label = "Loading",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export function ProjectGridSkeleton({
  count = 6,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <LoadingRegion className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </LoadingRegion>
  );
}

export function ListRowSkeleton({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <Card className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
      {withAvatar ? <Skeleton className="h-11 w-11 shrink-0 rounded-full" /> : <span />}
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20 shrink-0" />
    </Card>
  );
}

export function ListSkeleton({ count = 4, withAvatar = true }: { count?: number; withAvatar?: boolean }) {
  return (
    <LoadingRegion className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} withAvatar={withAvatar} />
      ))}
    </LoadingRegion>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <LoadingRegion className="divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function FormSkeleton({ fields = 5, className }: { fields?: number; className?: string }) {
  return (
    <LoadingRegion className={cn("space-y-5", className)}>
      <Skeleton className="h-7 w-1/3" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </LoadingRegion>
  );
}

export function DetailSkeleton() {
  return (
    <LoadingRegion>
      <Card className="overflow-hidden p-0">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </Card>
    </LoadingRegion>
  );
}

export function SwipeCardSkeleton() {
  return (
    <LoadingRegion>
      <Card className="overflow-hidden p-0">
        <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-[16/10]" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </Card>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </LoadingRegion>
  );
}

export function StatsRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-2 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-10" />
        </Card>
      ))}
    </LoadingRegion>
  );
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <LoadingRegion className="mx-auto max-w-2xl space-y-4 p-6" label={label}>
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </LoadingRegion>
  );
}
