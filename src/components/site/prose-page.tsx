import { Breadcrumbs } from "./breadcrumbs";

export function ProsePage({ title, path, lead, children, notice }: { title: string; path: string; lead?: string; children: React.ReactNode; notice?: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <Breadcrumbs items={[{ name: title, href: path }]} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {lead ? <p className="mt-3 text-lg text-muted-foreground">{lead}</p> : null}
      </header>
      {notice}
      <div className="space-y-6 leading-relaxed text-foreground/90 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function LegalDraftNotice() {
  return (
    <div role="note" className="mb-8 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <strong>Taslak metin.</strong> Bu metin hukuki danışmanlık niteliği taşımaz ve yayına alınmadan önce bir hukuk uzmanı tarafından incelenmelidir (bkz. LEGAL_REVIEW_CHECKLIST.md).
    </div>
  );
}
