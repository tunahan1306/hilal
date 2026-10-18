import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createLocationDirectory } from "@/domain/location-directory";
import { getRepository } from "../repositories";
export async function getLocations() {
  "use cache";
  cacheLife("hours");
  cacheTag("location-catalog");
  return getRepository().getLocations();
}
/** İstek başına bir kez kurulur (aynı istekteki sayfa, metadata ve bileşenler paylaşır). */
export const getLocationDirectory = cache(async () => createLocationDirectory(await getLocations()));
