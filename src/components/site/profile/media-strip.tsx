"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { useMediaLightbox, type MediaItem } from "./media-lightbox";

/**
 * Mobil kapak şeridi: yatay kaydırma (scroll-snap), sayaç ve dokununca lightbox.
 * Yalnızca md altı ekranlarda gösterilir.
 */
export function MediaStrip({ items, name }: { items: MediaItem[]; name: string }) {
  const { open } = useMediaLightbox();
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLUListElement>(null);
  return (
    <div className="relative -mx-4 sm:-mx-6 md:hidden">
      <ul
        ref={ref}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
        aria-label={`${name} — medya, ${items.length} öğe`}
        onScroll={(e) => {
          const el = e.currentTarget;
          setCurrent(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {items.map((m, i) => (
          <li key={`${m.url}-${i}`} className="w-full shrink-0 snap-center">
            <button type="button" onClick={() => open(i)} className="relative block aspect-[4/5] w-full bg-muted" aria-label={`${i + 1}. medyayı tam ekran aç`}>
              {m.kind === "video" && !m.poster ? (
                // Posteri olmayan video görsel kaynağı olarak verilmez (C-11); nötr yer tutucu gösterilir.
                <span className="absolute inset-0 bg-gradient-to-br from-muted to-secondary" aria-hidden />
              ) : <Image
                src={m.kind === "video" ? m.poster! : m.url}
                alt={m.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover object-[50%_30%]"
              />}
              {m.kind === "video" ? (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-14 place-items-center rounded-full bg-background/85 backdrop-blur"><Play className="size-6 translate-x-0.5" aria-hidden /></span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <p className="absolute bottom-3 right-4 rounded-xs bg-background/85 px-2 py-0.5 text-xs tabular-nums backdrop-blur" aria-live="polite">
          {current + 1} / {items.length}
        </p>
      ) : null}
    </div>
  );
}
