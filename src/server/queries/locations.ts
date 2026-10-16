import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createLocationDirectory } from "@/domain/location-directory";
import { getRepository } from "../repositories";
export async function getLocations() {
  "use cache";
  cacheLife("hours");
  cacheTag("location-catalog");
  return getRepository().getLocations();
}
export async function getLocationDirectory() {
  return createLocationDirectory(await getLocations());
}
