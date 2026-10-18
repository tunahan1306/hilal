import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocationPage, LocationPageSkeleton } from "@/components/site/location-page";
import { getLocale } from "@/i18n/server";
import { getLocationDirectory } from "@/server/queries/locations";
import { locationMetadata } from "@/server/queries/location-seo";

export async function generateStaticParams() {
  const { listProvinces } = await getLocationDirectory();
  return listProvinces().map((p) => ({ country: p.country, region: p.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]">): Promise<Metadata> {
  const { getProvinceIn } = await getLocationDirectory();
  const { country, region } = await params;
  const province = getProvinceIn(country, region);
  if (!province) return {};
  return locationMetadata(await getLocale(), province, undefined, await searchParams);
}

export default function RegionPage({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]">) {
  return (
    <Suspense fallback={<LocationPageSkeleton />}>
      <RegionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RegionContent({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]">) {
  // Geçersiz adresler proxy'de 404 ile yakalanır; bu kontrol ikinci savunma hattıdır.
  const { getProvinceIn } = await getLocationDirectory();
  const { country, region } = await params;
  const province = getProvinceIn(country, region);
  if (!province) notFound();
  return <LocationPage province={province} searchParams={searchParams} />;
}
