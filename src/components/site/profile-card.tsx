import Image from "next/image";
import Link from "next/link";
import type { PublicProfile } from "@/domain/types";
import { cn } from "@/lib/utils";
import { VerifiedMark } from "./verified-mark";

type Variant = "default" | "feature";

/**
 * Editoryal profil kartı: kutu/gölge yok; 4:5 görsel, altında konum (küçük
 * büyük harf), serif ad, yaş ve kısa bilgi. Kartın tamamı tek bir bağlantıdır.
 */
export function ProfileCard({
  profile,
  priority = false,
  variant = "default",
  sizes = "(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw",
  className,
}: {
  profile: PublicProfile;
  priority?: boolean;
  variant?: Variant;
  sizes?: string;
  className?: string;
}) {
  const image = profile.images[0];
  const location = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const feature = variant === "feature";
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xs bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || `${profile.nickname} profil fotoğrafı`}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover object-[50%_30%] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : null}
        {feature && profile.images.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-xs bg-background/85 px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-foreground backdrop-blur-sm">
            {profile.images.length} fotoğraf
          </span>
        ) : null}
      </div>
      <div className={cn("pt-3", feature && "pt-4")}>
        <p className="eyebrow flex flex-wrap items-center gap-x-2 text-muted-foreground" data-testid="card-location">
          {profile.sponsored ? <span className="text-brand">Sponsorlu</span> : null}
          {profile.sponsored ? <span aria-hidden>·</span> : null}
          <span className="truncate">{location}</span>
        </p>
        <h3 className={cn("mt-1.5 flex items-baseline gap-2", feature ? "text-display-sm" : "text-[1.3125rem] leading-tight")}>
          <Link
            href={`/profil/${profile.slug}`}
            className="font-display truncate underline-offset-[5px] decoration-1 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none"
          >
            {profile.nickname}
          </Link>
          <span className="shrink-0 font-sans text-sm tabular-nums text-muted-foreground">{profile.age}</span>
          {profile.verified ? <VerifiedMark className="shrink-0 self-center" /> : null}
        </h3>
        {profile.interests.length ? (
          <p className="mt-1 truncate text-sm text-muted-foreground" aria-label="İlgi alanları">
            {profile.interests.slice(0, feature ? 4 : 2).map((i) => i.name).join(" · ")}
          </p>
        ) : null}
        {feature ? <p className="mt-3 line-clamp-3 max-w-prose text-[0.9375rem] leading-relaxed text-foreground/80">{profile.bio}</p> : null}
      </div>
    </article>
  );
}
