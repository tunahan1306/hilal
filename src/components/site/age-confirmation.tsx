"use client";
import { useEffect, useRef } from "react";

export function AgeConfirmation({ returnTo, declined }: { returnTo: string; declined: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
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
        <p className="eyebrow text-brand">HİLAL · Yalnızca yetişkinler</p>
        <p className="font-display mt-6 text-6xl text-brass" aria-hidden>18+</p>
        <h1 id="age-title" className="font-display mt-5 text-display-md">{declined ? "Bu içerik yetişkinlere özeldir." : "Keşfetmeden önce."}</h1>
        <p id="age-description" className="mt-4 leading-relaxed text-muted-foreground">{declined ? "Yaş onayı vermediğiniz için profiller ve görseller gösterilmez." : "Hilal, yalnızca 18 yaşını doldurmuş yetişkinler için bir sosyal profil keşif platformudur. Devam etmek için yaşınızı onaylayın."}</p>
        {!declined ? <form action="/api/age-confirm" method="post" className="mt-8 grid gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <button name="decision" value="accept" className="min-h-12 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Evet, 18 yaşından büyüğüm</button>
          <button name="decision" value="decline" className="min-h-12 rounded-md border border-hairline px-4 py-3 text-sm">Hayır, 18 yaşından küçüğüm</button>
        </form> : null}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Bu beyan yaş doğrulama belgesi değildir. Profil sahiplerinin yaş ve yayın rızası kontrolleri ayrıca yapılır. Onay tercihi 30 gün saklanır.</p>
        <div className="mt-6 flex flex-wrap gap-5 text-sm"><a className="underline underline-offset-4" href="/guvenlik">Güvenlik</a><a className="underline underline-offset-4" href="/kvkk">Gizlilik</a></div>
      </div>
    </main>
  );
}
