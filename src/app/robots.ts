import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { LOCALES } from "@/i18n/config";
import { localizedPath } from "@/i18n/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/media/", ...LOCALES.flatMap((l) => [localizedPath(l, "notFound"), localizedPath(l, "reported"), `${localizedPath(l, "explore")}?*`])] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
