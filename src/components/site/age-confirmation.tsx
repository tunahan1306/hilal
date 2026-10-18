"use client";
import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/client";
import { localizedPath } from "@/i18n/routes";

export function AgeConfirmation({ returnTo, declined }: { returnTo: string; declined: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const { lang, m } = useI18n();
  const a = m.age;
  useEffect(() => { dialog.current?.focus(); }, []);
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="age-title" aria-describedby="age-description" tabIndex={-1}
        className="w-full max-w-lg border border-hairline bg-paper p-7 shadow-2xl outline-none sm:p-12"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const elements = dialog.current?.querySelectorAll<HTMLElement>("button, a[href]");
          if (!elements?.length) return;
          const first = elements[0], last = elements[elements.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
        }}>
        <p className="eyebrow text-brand">{a.eyebrow}</p>
        <p className="font-display mt-6 text-6xl text-brass" aria-hidden>18+</p>
        <h1 id="age-title" className="font-display mt-5 text-display-md">{declined ? a.titleDeclined : a.title}</h1>
        <p id="age-description" className="mt-4 leading-relaxed text-muted-foreground">{declined ? a.descriptionDeclined : a.description}</p>
        {!declined ? <form action="/api/age-confirm" method="post" className="mt-8 grid gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="lang" value={lang} />
          <button name="decision" value="accept" className="min-h-12 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">{a.accept}</button>
          <button name="decision" value="decline" className="min-h-12 rounded-md border border-hairline px-4 py-3 text-sm">{a.decline}</button>
        </form> : null}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{a.note}</p>
        <div className="mt-6 flex flex-wrap gap-5 text-sm"><a className="underline underline-offset-4" href={localizedPath(lang, "safety")}>{a.safety}</a><a className="underline underline-offset-4" href={localizedPath(lang, "privacy")}>{a.privacy}</a></div>
      </div>
    </main>
  );
}
