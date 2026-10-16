"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Img = { url: string; alt: string; width: number; height: number };

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  if (!current) return null;
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={current.url}
          alt={current.alt || `${name} fotoğrafı ${index + 1}`}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 480px, 100vw"
          className="object-cover"
        />
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-xs tabular-nums backdrop-blur" aria-live="polite">
            {index + 1} / {images.length}
          </span>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2" aria-label="Fotoğraflar">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Fotoğraf ${i + 1}`}
                aria-current={i === index}
                className={cn("relative block aspect-square w-full overflow-hidden rounded-lg ring-offset-2 ring-offset-background transition", i === index ? "ring-2 ring-ring" : "opacity-70 hover:opacity-100")}
              >
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
