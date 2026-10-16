import type { Metadata } from "next";
import { Check } from "lucide-react";
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
    <ProsePage title="Üyelik paketleri" path="/paketler" lead="Profil sahipleri için görünürlük paketleri. Paketler yalnızca sosyal tanışma faaliyetleri içindir.">
      <div role="note" className="rounded-xl border border-border bg-muted/50 p-4 text-sm">
        Şu anda platform üzerinden ödeme alınmamaktadır. Paketler yönetim tarafından tanımlanır; sponsorlu profiller ziyaretçilere her zaman “Sponsorlu” etiketiyle gösterilir.
      </div>
      <ul className="not-prose grid gap-4 md:grid-cols-3">
        {plans.sort((a, b) => order[a.code] - order[b.code]).map((p) => (
          <li key={p.id} className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="!mt-0 text-xl font-semibold">{p.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <ul className="mt-5 space-y-2 text-sm !list-none !pl-0">
              <Feature>En fazla {p.maxPhotos} fotoğraf</Feature>
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
    <li className={`flex items-center gap-2 ${off ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}>
      <Check className={`size-4 ${off ? "opacity-30" : "text-brand"}`} aria-hidden />
      <span>{children}</span>
      {off ? <span className="sr-only">(dahil değil)</span> : null}
    </li>
  );
}
