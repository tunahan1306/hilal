import type { PublicProfile } from "@/domain/types";
import { cn } from "@/lib/utils";
import { ProfileCard } from "./profile-card";

export function ProfileGrid({ profiles, priorityCount = 0, columns = 4, className }: { profiles: PublicProfile[]; priorityCount?: number; columns?: 3 | 4; className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:gap-y-14",
        columns === 4 ? "lg:grid-cols-4 lg:gap-x-8" : "lg:gap-x-8",
        className,
      )}
      role="list"
    >
      {profiles.map((p, i) => (
        <li key={p.id} className="flex">
          <ProfileCard
            profile={p}
            priority={i < priorityCount}
            className="w-full"
            sizes={columns === 3 ? "(min-width: 1280px) 340px, (min-width: 640px) 30vw, 46vw" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProfileGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6", columns === 4 ? "lg:grid-cols-4 lg:gap-x-8" : "lg:gap-x-8")}
      aria-busy="true"
      aria-label="Profiller yükleniyor"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-xs bg-muted" />
          <div className="mt-3 h-2.5 w-1/3 animate-pulse rounded-xs bg-muted" />
          <div className="mt-2.5 h-5 w-1/2 animate-pulse rounded-xs bg-muted" />
        </div>
      ))}
    </div>
  );
}
