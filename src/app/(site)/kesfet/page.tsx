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
    description: "Türkiye genelinde şehir, ilçe, yaş aralığı ve ilgi alanına göre doğrulanmış sosyal profilleri keşfedin.",
    alternates: { canonical: "/kesfet" },
    // Filtrelenmiş ve sayfalanmış varyantlar indekslenmez (ince/kopya içerik önlemi).
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default function ExplorePage({ searchParams }: PageProps<"/kesfet">) {
  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "Keşfet", href: "/kesfet" }]} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-semibold sm:text-4xl">Profilleri keşfet</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Şehir, yaş aralığı ve ortak ilgi alanlarına göre filtreleyin.</p>
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
