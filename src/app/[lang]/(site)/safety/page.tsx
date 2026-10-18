import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/site/prose-page";
import { REPORT_CATEGORIES } from "@/domain/types";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return i18nPageMeta(lang, "safety", undefined, m.safety.metaTitle, m.safety.metaDescription);
}

export default async function SafetyPage() {
  const { lang, m } = await getI18n();
  const s = m.safety;
  const [before, after] = s.removalText.split("{link}");
  return (
    <ProsePage eyebrow={s.eyebrow} title={s.title} path={localizedPath(lang, "safety")} lead={s.lead}>
      <h2 id="yetiskin">{s.adultsTitle}</h2>
      <p>{s.adultsText}</p>
      <p>{s.layersIntro}</p>
      <ul>
        {s.layers.map(([label, text]) => <li key={label}><strong>{label}</strong> {text}</li>)}
      </ul>
      <h2>{s.whoTitle}</h2>
      <ul>{s.who.map((t) => <li key={t}>{t}</li>)}</ul>
      <h2>{s.bannedTitle}</h2>
      <ul>{s.banned.map((t) => <li key={t}>{t}</li>)}</ul>
      <h2>{s.enforceTitle}</h2>
      <p>{s.enforceText}</p>
      <h2>{s.categoriesTitle}</h2>
      <ul>{REPORT_CATEGORIES.map((c) => <li key={c}>{m.report.categories[c]}</li>)}</ul>
      <p>{s.categoriesText}</p>
      <h2>{s.protectTitle}</h2>
      <ul>{s.protect.map((t) => <li key={t}>{t}</li>)}</ul>
      <h2>{s.removalTitle}</h2>
      <p>
        {before}
        <Link href={localizedPath(lang, "removal")} className="text-brand underline underline-offset-4">{s.removalLink}</Link>
        {after}
      </p>
    </ProsePage>
  );
}
