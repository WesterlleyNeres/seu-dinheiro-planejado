import { Skeleton } from "@/components/ui/skeleton";

export const TenantLoadingFallback = () => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card p-4">
        {/* Logo skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        {/* Section title skeleton */}
        <Skeleton className="h-3 w-16 mb-3" />

        {/* Nav items skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-border" />

        {/* Second section title skeleton */}
        <Skeleton className="h-3 w-16 mb-3" />

        {/* More nav items skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 pl-64">
        {/* Topbar skeleton */}
        <header className="fixed top-0 left-64 right-0 z-30 h-14 border-b border-border bg-background px-6">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content skeleton */}
        <main className="pt-14 p-8">
          <div className="space-y-6">
            {/* Page title skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>

            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>

            {/* Main content skeleton */}
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </main>
      </div>
    </div>
  );
};
