import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProfileListing, ProfileListingSkeleton } from "@/components/site/profile-listing";
import { hasActiveFilters, parseFilters } from "@/domain/filters";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";

export async function generateMetadata({ searchParams }: PageProps<"/[lang]/explore">): Promise<Metadata> {
  const { lang, m } = await getI18n();
  const filters = parseFilters(await searchParams);
  const filtered = hasActiveFilters(filters) || filters.sayfa > 1;
  // Filtrelenmiş ve sayfalanmış varyantlar indekslenmez (ince/kopya içerik önlemi).
  return i18nPageMeta(lang, "explore", undefined, m.explore.metaTitle, m.explore.metaDescription, filtered ? { robots: { index: false, follow: true } } : {});
}

export default async function ExplorePage({ searchParams }: PageProps<"/[lang]/explore">) {
  const { lang, m } = await getI18n();
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: m.explore.title, href: localizedPath(lang, "explore") }]} />
      <header className="mb-10 mt-8 grid gap-4 border-b border-hairline pb-10 lg:mb-12 lg:grid-cols-12 lg:items-end">
        <h1 className="font-display text-display-xl lg:col-span-7">{m.explore.title}</h1>
        <p className="max-w-[44ch] text-lede text-muted-foreground lg:col-span-5 lg:justify-self-end">{m.explore.lead}</p>
      </header>
      <Suspense fallback={<ProfileListingSkeleton />}>
        <ExploreResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ExploreResults({ searchParams }: Pick<PageProps<"/[lang]/explore">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  return <ProfileListing filters={filters} mode={{ type: "explore" }} />;
}
