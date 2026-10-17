import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { ProsePage } from "@/components/site/prose-page";
import { getPlans } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Üyelik paketleri",
  description: "Profil sahipleri için hukuka uygun görünürlük paketleri: Basic, Plus ve Premium.",
  alternates: { canonical: "/paketler" },
};

export default async function PlansPage() {
  const plans = (await getPlans()).filter((p) => p.active);
  const order = { basic: 0, plus: 1, premium: 2 } as const;
  return (
    <ProsePage eyebrow="Profil sahipleri için" title="Üyelik paketleri" path="/paketler" lead="Profil sahipleri için görünürlük paketleri. Paketler yalnızca sosyal tanışma faaliyetleri içindir.">
      <div role="note" className="border-l-2 border-brass py-1 pl-4 text-sm text-muted-foreground">
        Şu anda platform üzerinden ödeme alınmamaktadır. Paketler yönetim tarafından tanımlanır; sponsorlu profiller ziyaretçilere her zaman “Sponsorlu” etiketiyle gösterilir.
      </div>
      <ul className="grid gap-0 border-t border-hairline md:grid-cols-3 md:gap-8 md:border-t-0">
        {plans.sort((a, b) => order[a.code] - order[b.code]).map((p) => (
          <li key={p.id} className="flex flex-col border-b border-hairline py-6 md:border-b-0 md:border-t md:border-foreground/80 md:pt-5">
            <h2 className="!mt-0 !border-0 !pt-0">{p.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <ul className="mt-5 space-y-2 text-sm !list-none !pl-0">
              <Feature>En fazla {p.storageQuotaMb} MB depolama</Feature>
              <Feature off={!p.sponsoredEligible}>Sponsorlu görünürlük</Feature>
              <Feature off={!p.customization}>Gelişmiş kişiselleştirme</Feature>
              <Feature off={!p.advancedStats}>İlave istatistikler</Feature>
            </ul>
          </li>
        ))}
      </ul>
    </ProsePage>
  );
}

function Feature({ children, off }: { children: React.ReactNode; off?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${off ? "text-muted-foreground" : ""}`}>
      {off ? <Minus className="size-4 opacity-60" aria-hidden /> : <Check className="size-4 text-brand" aria-hidden />}
      <span>{children}</span>
      {off ? <span className="sr-only">(dahil değil)</span> : null}
    </li>
  );
}
