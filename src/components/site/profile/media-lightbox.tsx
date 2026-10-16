"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type MediaItem =
  | { kind: "image"; url: string; alt: string; width: number; height: number }
  | { kind: "video"; url: string; poster: string | null; alt: string; width: number; height: number; mimeType: string };

const WIDTHS = [640, 1080, 1600, 2048];

/** Next görsel optimizasyonu üzerinden duyarlı kaynaklar (yerel ve izinli uzak görseller). */
function optimized(url: string, w: number) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=82`;
}

function toSlide(m: MediaItem): Slide {
  if (m.kind === "video") {
    return {
      type: "video",
      poster: m.poster ?? undefined,
      width: m.width,
      height: m.height,
      sources: [{ src: m.url, type: m.mimeType }],
    };
  }
  return {
    src: optimized(m.url, 2048),
    alt: m.alt,
    width: m.width,
    height: m.height,
    srcSet: WIDTHS.filter((w) => w <= Math.max(m.width, 640)).map((w) => ({ src: optimized(m.url, w), width: w, height: Math.round((m.height / m.width) * w) })),
  };
}

type Ctx = { open: (index: number) => void; count: number };
const MediaContext = createContext<Ctx | null>(null);

export function useMediaLightbox(): Ctx {
  const ctx = use(MediaContext);
  if (!ctx) throw new Error("useMediaLightbox, ProfileMediaProvider içinde kullanılmalı");
  return ctx;
}

/**
 * Profil medya lightbox'ı.
 * - Klavye (← → Esc), kaydırma, yakınlaştırma; odak lightbox içinde tutulur.
 * - Tarayıcının geri tuşu lightbox'ı kapatır (geçmiş kaydı).
 * - Videolar otomatik oynatılmaz; yalnızca kullanıcı başlatır.
 */
export function ProfileMediaProvider({ items, name, children }: { items: MediaItem[]; name: string; children: React.ReactNode }) {
  const [index, setIndex] = useState(-1);
  const pushed = useRef(false);
  const slides = useMemo(() => items.map(toSlide), [items]);

  const open = useCallback((i: number) => {
    setIndex(i);
    if (!pushed.current) {
      history.pushState({ ...history.state, hilalLightbox: true }, "");
      pushed.current = true;
    }
  }, []);

  const close = useCallback(() => {
    setIndex(-1);
    if (pushed.current) {
      pushed.current = false;
      history.back();
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false;
        setIndex(-1);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const ctx = useMemo(() => ({ open, count: items.length }), [open, items.length]);

  return (
    <MediaContext value={ctx}>
      {children}
      <Lightbox
        open={index >= 0}
        index={Math.max(index, 0)}
        close={close}
        slides={slides}
        plugins={[Counter, Zoom, Video]}
        on={{ view: ({ index: i }) => setIndex(i) }}
        carousel={{ finite: items.length <= 1, preload: 2 }}
        controller={{ closeOnBackdropClick: true }}
        video={{ autoPlay: false, controls: true, playsInline: true, preload: "metadata" }}
        zoom={{ maxZoomPixelRatio: 2 }}
        counter={{ container: { style: { top: "unset", bottom: 0 } } }}
        labels={{
          Previous: "Önceki",
          Next: "Sonraki",
          Close: "Kapat",
          Lightbox: `${name} — medya galerisi`,
          Carousel: "Medya",
          Slide: "Medya",
          "Photo gallery": "Galeri",
          "{index} of {total}": "{index} / {total}",
          "Zoom in": "Yakınlaştır",
          "Zoom out": "Uzaklaştır",
        }}
        styles={{ container: { backgroundColor: "rgb(10 11 14 / 0.96)" } }}
      />
    </MediaContext>
  );
}

/** Lightbox'ı belirli bir öğede açan düğme. */
export function OpenMediaButton({ index, label, className, children }: { index: number; label: string; className?: string; children: React.ReactNode }) {
  const { open } = useMediaLightbox();
  return (
    <button type="button" onClick={() => open(index)} aria-label={label} className={className}>
      {children}
    </button>
  );
}
