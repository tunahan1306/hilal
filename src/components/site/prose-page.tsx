import { Breadcrumbs } from "./breadcrumbs";

/** Metin ağırlıklı sayfalar: editoryal başlık, 68ch okuma sütunu, saç çizgili bölümler. */
export function ProsePage({ title, path, lead, eyebrow, children, notice }: { title: string; path: string; lead?: string; eyebrow?: string; children: React.ReactNode; notice?: React.ReactNode }) {
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: title, href: path }]} />
      <header className="mb-12 mt-8 grid gap-6 border-b border-hairline pb-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {eyebrow ? <p className="eyebrow mb-4 text-muted-foreground">{eyebrow}</p> : null}
          <h1 className="font-display text-display-lg">{title}</h1>
          {lead ? <p className="mt-5 max-w-[56ch] text-lede text-muted-foreground">{lead}</p> : null}
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-12">
        <div className="lg:col-span-8 lg:col-start-3">
          {notice}
          <div className="measure space-y-5 text-[1rem] leading-[1.75] text-foreground/90 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-hairline [&_h2]:pt-8 [&_h2]:text-display-sm [&_h2]:text-foreground [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-brass">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegalDraftNotice() {
  return (
    <div role="note" className="mb-10 border-l-2 border-warning bg-warning/8 py-3 pl-4 pr-3 text-sm">
      <strong className="font-medium">Taslak metin.</strong> Bu metin hukuki danışmanlık niteliği taşımaz ve yayına alınmadan önce bir hukuk uzmanı tarafından incelenmelidir (bkz. LEGAL_REVIEW_CHECKLIST.md).
    </div>
  );
}
