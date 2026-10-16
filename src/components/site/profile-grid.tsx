import type { PublicProfile } from "@/domain/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "./profile-card";

export function ProfileGrid({ profiles, priorityCount = 0 }: { profiles: PublicProfile[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="list">
      {profiles.map((p, i) => (
        <li key={p.id} className="flex">
          <ProfileCard profile={p} priority={i < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

export function ProfileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Profiller yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <Skeleton className="aspect-[4/5] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
