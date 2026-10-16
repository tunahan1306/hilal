"use client";
/** Responsive sources terminate at a cookie-aware optimizer, not an internal cookieless fetch. */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return `/api/image?src=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
