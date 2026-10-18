import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { isPublishable, publishableCountries, type CountryPolicy } from "@/domain/country-policy";
import type { CountryCode } from "@/domain/countries";
import { getRepository } from "../repositories";

/**
 * Ülke yayın politikaları istek anında okunur (önbelleksiz): onay geri çekildiğinde veya
 * gözden geçirme tarihi geçtiğinde etkisi bir sonraki istekte görülür. İstek başına bir kez.
 */
export const getCountryPolicies = cache(async (): Promise<CountryPolicy[]> => {
  await connection();
  return getRepository().listCountryPolicies();
});

export async function getPublishableCountries(): Promise<CountryCode[]> {
  return publishableCountries(await getCountryPolicies());
}

export async function isCountryPublishable(country: CountryCode): Promise<boolean> {
  return isPublishable((await getCountryPolicies()).find((p) => p.code === country));
}
