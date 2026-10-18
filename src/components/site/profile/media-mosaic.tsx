"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { OpenMediaButton, type MediaItem } from "./media-lightbox";

/**
 * Galeri mozaiği: ilk öğe iki sütun kaplar; görseller tembel yüklenir ve
 * tıklanınca lightbox'ta açılır. Kırpma yüz alanını korumak için üst-orta odaklıdır.
 */
export function MediaMosaic({ items, name, startIndex = 0 }: { items: MediaItem[]; name: string; startIndex?: number }) {
  const { m } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4" role="list">
      {items.map((item, i) => {
        const index = startIndex + i;
        // Geniş ilk öğe yalnızca 4 sütunlu ızgarada boşluk bırakmayacaksa (4 + n*4 + 1 düzeni)
        const wide = i === 0 && items.length >= 5 && (items.length - 5) % 4 === 0;
        return (
          <li key={`${item.url}-${index}`} className={cn(wide && "col-span-2 row-span-2")}>
            <OpenMediaButton
              index={index}
              label={fmt(item.kind === "video" ? m.media.openVideo : m.media.openPhoto, { n: index + 1 })}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xs bg-muted"
            >
              {item.kind === "video" && !item.poster ? (
                // Posteri olmayan video görsel kaynağı olarak verilmez (C-11); nötr yer tutucu gösterilir.
                <span className="absolute inset-0 bg-gradient-to-br from-muted to-secondary" aria-hidden />
              ) : <Image
                src={item.kind === "video" ? item.poster! : item.url}
                alt={item.alt || fmt(m.media.galleryAlt, { name, n: index + 1 })}
                fill
                sizes={wide ? "(min-width: 1024px) 40vw, 92vw" : "(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw"}
                className="object-cover object-[50%_30%] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03] motion-reduce:transform-none"
              />}
              {item.kind === "video" ? (
                <span className="absolute inset-0 grid place-items-center bg-black/10">
                  <span className="grid size-12 place-items-center rounded-full bg-background/85 backdrop-blur"><Play className="size-5 translate-x-0.5" aria-hidden /></span>
                </span>
              ) : null}
            </OpenMediaButton>
          </li>
        );
      })}
    </ul>
  );
}
