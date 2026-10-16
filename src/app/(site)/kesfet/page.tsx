import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProfileListing, ProfileListingSkeleton } from "@/components/site/profile-listing";
import { hasActiveFilters, parseFilters } from "@/domain/filters";

export async function generateMetadata({ searchParams }: PageProps<"/kesfet">): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const filtered = hasActiveFilters(filters) || filters.sayfa > 1;
  return {
    title: "Profilleri keşfet",
    description: "Türkiye genelinde şehir, ilçe, yaş aralığı göre doğrulanmış sosyal profilleri keşfedin.",
    alternates: { canonical: "/kesfet" },
    // Filtrelenmiş ve sayfalanmış varyantlar indekslenmez (ince/kopya içerik önlemi).
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default function ExplorePage({ searchParams }: PageProps<"/kesfet">) {
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: "Keşfet", href: "/kesfet" }]} />
      <header className="mb-10 mt-8 grid gap-4 border-b border-hairline pb-10 lg:mb-12 lg:grid-cols-12 lg:items-end">
        <h1 className="font-display text-display-xl lg:col-span-7">Keşfet</h1>
        <p className="max-w-[44ch] text-lede text-muted-foreground lg:col-span-5 lg:justify-self-end">
          Türkiye genelinde, rızası alınmış ve yaşı doğrulanmış yetişkin profiller. Şehir, yaş aralığı ve konuma göre daraltın.
        </p>
      </header>
      <Suspense fallback={<ProfileListingSkeleton />}>
        <ExploreResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ExploreResults({ searchParams }: Pick<PageProps<"/kesfet">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  return <ProfileListing filters={filters} mode={{ type: "explore" }} />;
}
