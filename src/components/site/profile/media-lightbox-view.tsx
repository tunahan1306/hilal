"use client";

import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import type { MediaItem } from "./media-lightbox";

const WIDTHS = [640, 1080, 1600, 2048];

/** Görsel vekili üzerinden duyarlı kaynaklar. */
function optimized(url: string, w: number) {
  return `/api/image?src=${encodeURIComponent(url)}&w=${w}&q=82`;
}

function toSlide(m: MediaItem): Slide {
  if (m.kind === "video") {
    return { type: "video", poster: m.poster ?? undefined, width: m.width, height: m.height, sources: [{ src: m.url, type: m.mimeType }] };
  }
  // Doğal genişliği aşan kaynak istenmez: küçük görsel büyütülerek bulanıklaşmaz (P-12).
  const widths = WIDTHS.filter((w) => w <= m.width);
  const usable = widths.length ? widths : [WIDTHS[0]];
  const largest = usable[usable.length - 1];
  return {
    src: optimized(m.url, largest),
    alt: m.alt,
    width: Math.min(m.width, largest),
    height: Math.round((m.height / m.width) * Math.min(m.width, largest)),
    srcSet: usable.map((w) => ({ src: optimized(m.url, w), width: w, height: Math.round((m.height / m.width) * w) })),
  };
}

/** Lightbox kütüphanesi ve CSS'i yalnızca galeri ilk kez açıldığında yüklenir (C-24). */
export default function MediaLightboxView({ items, name, index, onClose, onView }: { items: MediaItem[]; name: string; index: number; onClose: () => void; onView: (i: number) => void }) {
  const single = items.length <= 1;
  return (
    <Lightbox
      open={index >= 0}
      index={Math.max(index, 0)}
      close={onClose}
      slides={items.map(toSlide)}
      plugins={[Counter, Zoom, Video]}
      on={{ view: ({ index: i }) => onView(i) }}
      carousel={{ finite: single, preload: 2, imageFit: "contain" }}
      controller={{ closeOnBackdropClick: true }}
      // Tek öğede gezinme okları anlamsız; gösterilmez (P-12).
      render={single ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      video={{ autoPlay: false, controls: true, playsInline: true, preload: "metadata" }}
      zoom={{ maxZoomPixelRatio: 1 }}
      counter={single ? { container: { style: { display: "none" } } } : { container: { style: { top: "unset", bottom: 0 } } }}
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
  );
}
