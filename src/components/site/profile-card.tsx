"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { whatsAppHref } from "@/domain/whatsapp";
import type { CardProfile } from "@/domain/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { localizedPath } from "@/i18n/routes";
import { cn } from "@/lib/utils";
import { VerifiedMark } from "./verified-mark";

/**
 * Profile links use document navigation so moderation invalidation cannot leave a stale RSC stream.
 * Editoryal profil kartı: kutu/gölge yok; 4:5 görsel, altında konum (küçük
 * büyük harf), serif ad, yaş ve kısa bilgi. Kartın tamamı tek bir bağlantıdır.
 */
export function ProfileCard({
  profile,
  priority = false,
  sizes = "(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw",
  className,
}: {
  profile: CardProfile;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const { lang, m } = useI18n();
  const image = profile.images[0];
  // Kurgusal örnek kayıt gerçek bir kişiye iletişim bağlantısı taşıyamaz (veritabanı da numarayı vermez).
  const whatsapp = profile.isExample ? null : whatsAppHref(profile.whatsappPhone);
  const location = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xs bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || fmt(m.card.photoAlt, { name: profile.nickname })}
            fill
            sizes={sizes}
            // Next 16: `priority` = <head> önyüklemesi; kartlar akışla (Suspense) geldiği için etkisizdi.
            // Görünür ilk kartlar için doğrudan yüksek öncelikli, ertelenmeyen yükleme.
            {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
            className="object-cover object-[50%_30%] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : profile.isExample ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <span className="font-display text-7xl text-brand" aria-hidden>{profile.nickname.charAt(0)}</span>
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <p className="eyebrow flex flex-wrap items-center gap-x-2 text-muted-foreground" data-testid="card-location">
          {profile.isExample ? <span className="rounded-xs border border-current px-1.5 text-foreground" data-testid="example-badge">{m.common.exampleBadge}</span> : null}
          {profile.sponsored ? <span className="text-brand">{m.card.sponsored}</span> : null}
          {profile.sponsored || profile.isExample ? <span aria-hidden>·</span> : null}
          <span className="truncate">{location}</span>
        </p>
        <h3 className="mt-1.5 flex items-baseline gap-2 text-[1.3125rem] leading-tight">
          <a
            href={localizedPath(lang, "profile", { slug: profile.slug })}
            className="font-display truncate underline-offset-[5px] decoration-1 after:absolute after:inset-0 group-hover:underline focus-visible:after:outline-2 focus-visible:after:outline-ring focus-visible:after:outline-offset-4"
          >
            {profile.nickname}
          </a>
          <span className="shrink-0 font-sans text-sm tabular-nums text-muted-foreground">{profile.age}</span>
          {profile.verified ? <VerifiedMark className="shrink-0 self-center" /> : null}
        </h3>
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer nofollow" aria-label={fmt(m.card.whatsappAria, { name: profile.nickname })} className="relative z-10 mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a> : null}

      </div>
    </article>
  );
}
