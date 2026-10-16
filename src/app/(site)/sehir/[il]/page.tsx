import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocationPage } from "@/components/site/location-page";
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

export default async function CityPage({ params, searchParams }: PageProps<"/sehir/[il]">) {
  const province = getProvince((await params).il);
  if (!province) notFound();
  return <LocationPage province={province} searchParams={searchParams} />;
}
