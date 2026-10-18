import type { Metadata } from "next";
import { fmt } from "@/i18n/config";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { Check, Minus } from "lucide-react";
import { ProsePage } from "@/components/site/prose-page";
import { getPlans } from "@/server/queries/public";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  return i18nPageMeta(lang, "packages", undefined, m.packages.metaTitle, m.packages.metaDescription);
}

export default async function PlansPage() {
  const { lang, m } = await getI18n();
  const k = m.packages;
  const plans = (await getPlans()).filter((p) => p.active);
  const order = { basic: 0, plus: 1, premium: 2 } as const;
  return (
    <ProsePage eyebrow={k.eyebrow} title={k.title} path={localizedPath(lang, "packages")} lead={k.lead}>
      <div role="note" className="border-l-2 border-brass py-1 pl-4 text-sm text-muted-foreground">
        {k.note}
      </div>
      <ul className="grid gap-0 border-t border-hairline md:grid-cols-3 md:gap-8 md:border-t-0">
        {plans.sort((a, b) => order[a.code] - order[b.code]).map((p) => (
          <li key={p.id} className="flex flex-col border-b border-hairline py-6 md:border-b-0 md:border-t md:border-foreground/80 md:pt-5">
            <h2 className="!mt-0 !border-0 !pt-0">{p.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <ul className="mt-5 space-y-2 text-sm !list-none !pl-0">
              <Feature notIncluded={k.notIncluded}>{fmt(k.storage, { n: p.storageQuotaMb })}</Feature>
              <Feature off={!p.sponsoredEligible} notIncluded={k.notIncluded}>{k.sponsored}</Feature>
              <Feature off={!p.customization} notIncluded={k.notIncluded}>{k.customization}</Feature>
              <Feature off={!p.advancedStats} notIncluded={k.notIncluded}>{k.stats}</Feature>
            </ul>
          </li>
        ))}
      </ul>
    </ProsePage>
  );
}

function Feature({ children, off, notIncluded }: { children: React.ReactNode; off?: boolean; notIncluded: string }) {
  return (
    <li className={`flex items-center gap-2 ${off ? "text-muted-foreground" : ""}`}>
      {off ? <Minus className="size-4 opacity-60" aria-hidden /> : <Check className="size-4 text-brand" aria-hidden />}
      <span>{children}</span>
      {off ? <span className="sr-only">{notIncluded}</span> : null}
    </li>
  );
}
