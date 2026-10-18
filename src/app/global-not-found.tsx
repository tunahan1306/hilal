import type { Metadata } from "next";
import { RootDocument } from "@/components/root-document";
import { CrescentMark } from "@/components/site/logo";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routes";

export const metadata: Metadata = { title: "404 — Hilal", robots: { index: false, follow: false } };

/** Hiçbir rotayla eşleşmeyen adresler: dil bilinmediği için tüm dillerde kısa yönlendirme. */
export default function GlobalNotFound() {
  return (
    <RootDocument lang="en">
      <main id="icerik" className="container-page flex flex-1 flex-col justify-center py-24">
        <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> 404</p>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          {LOCALES.map((l) => {
            const m = getMessages(l).notFound;
            return (
              <li key={l} lang={l} className="border-t border-hairline pt-4">
                <h1 className="font-display text-display-sm">{m.title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
                <a href={localizedPath(l, "explore")} className="mt-3 inline-flex min-h-11 items-center text-sm text-brand underline-offset-4 hover:underline">{m.explore} · {LOCALE_NAMES[l]}</a>
              </li>
            );
          })}
        </ul>
      </main>
    </RootDocument>
  );
}
