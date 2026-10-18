import type { Metadata } from "next";
import Link from "next/link";
import { CrescentMark } from "@/components/site/logo";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.reported.metaTitle, robots: { index: false, follow: false } };
}

export default async function ReportReceivedPage() {
  const { lang, m } = await getI18n();
  return (
    <div className="container-page py-24" role="status">
      <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> {m.reported.eyebrow}</p>
      <h1 className="font-display mt-5 text-display-lg">{m.reported.title}</h1>
      <p className="mt-4 max-w-md text-lede text-muted-foreground">{m.reported.text}</p>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{m.reported.emergency}</p>
      <Link href={localizedPath(lang, "explore")} className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{m.reported.continue}</Link>
    </div>
  );
}
