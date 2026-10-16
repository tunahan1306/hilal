import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { PublicProfile } from "@/domain/types";
import { cn } from "@/lib/utils";

export function ProfileCard({ profile, priority = false, className }: { profile: PublicProfile; priority?: boolean; className?: string }) {
  const image = profile.images[0];
  const location = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-raised)] focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || `${profile.nickname} profil fotoğrafı`}
            fill
            sizes="(min-width: 1024px) 270px, 48vw"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.03] motion-reduce:transform-none"
            priority={priority}
            unoptimized={image.url.endsWith(".svg")}
          />
        ) : null}
        {profile.sponsored ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[0.7rem] font-medium tracking-wide text-foreground shadow-sm backdrop-blur">
            Sponsorlu
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[0.95rem] font-semibold sm:text-base">
            <Link href={`/profil/${profile.slug}`} className="truncate after:absolute after:inset-0 focus-visible:outline-none">
              {profile.nickname}
            </Link>
            {profile.verified ? (
              <BadgeCheck className="size-4 shrink-0 text-brand" aria-label="Doğrulanmış profil" role="img" />
            ) : null}
          </h3>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{profile.age}</span>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground sm:text-sm" data-testid="card-location">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
        </p>
        <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85 max-sm:hidden">{profile.bio}</p>
        {profile.interests.length ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1" aria-label="İlgi alanları">
            {profile.interests.slice(0, 3).map((i) => (
              <li key={i.slug} className="rounded-full max-sm:[&:nth-child(n+3)]:hidden bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {i.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
