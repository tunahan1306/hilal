"use client";

import dynamic from "next/dynamic";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MediaItem =
  | { kind: "image"; url: string; alt: string; width: number; height: number }
  | { kind: "video"; url: string; poster: string | null; alt: string; width: number; height: number; mimeType: string };

const MediaLightboxView = dynamic(() => import("./media-lightbox-view"), { ssr: false });

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
 * - Kütüphane ilk açılışta yüklenir; sayfa ilk yüklemesine JS/CSS eklemez.
 */
export function ProfileMediaProvider({ items, name, children }: { items: MediaItem[]; name: string; children: React.ReactNode }) {
  const [index, setIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const pushed = useRef(false);

  const open = useCallback((i: number) => {
    setMounted(true);
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
      {mounted ? <MediaLightboxView items={items} name={name} index={index} onClose={close} onView={setIndex} /> : null}
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
