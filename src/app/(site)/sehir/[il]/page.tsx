import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocationPage, LocationPageSkeleton } from "@/components/site/location-page";
import { getProvince, listProvinces } from "@/domain/locations";
import { locationMetadata } from "@/server/queries/location-seo";

export function generateStaticParams() {
  return listProvinces().map((p) => ({ il: p.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/sehir/[il]">): Promise<Metadata> {
  const province = getProvince((await params).il);
  if (!province) return {};
  return locationMetadata(province, undefined, await searchParams);
}

export default function CityPage({ params, searchParams }: PageProps<"/sehir/[il]">) {
  return (
    <Suspense fallback={<LocationPageSkeleton />}>
      <CityContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CityContent({ params, searchParams }: PageProps<"/sehir/[il]">) {
  // Geçersiz il slug'ı proxy'de 404 ile yakalanır; bu kontrol ikinci savunma hattıdır.
  const province = getProvince((await params).il);
  if (!province) notFound();
  return <LocationPage province={province} searchParams={searchParams} />;
}
