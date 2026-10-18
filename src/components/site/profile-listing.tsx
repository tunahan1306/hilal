import Link from "next/link";
import { Users } from "lucide-react";
import { hasActiveFilters, type ProfileFilters } from "@/domain/filters";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { getLocationDirectory } from "@/server/queries/locations";
import { Button } from "@/components/ui/button";
import { discoverProfiles } from "@/server/queries/public";
import { EmptyState } from "./empty-state";
import { FilterBar, FilterRail, type FilterMode } from "./filter-bar";
import { ProgressiveProfiles } from "./progressive-profiles";
import { ProfileGridSkeleton } from "./profile-grid";

/** Keşfet ve konum sayfalarının ortak listeleme bölümü. */
export async function ProfileListing({ filters, mode }: { filters: ProfileFilters; mode: FilterMode }) {
  const [{ lang, m }, { getProvince, listDistricts, listProvinces }] = await Promise.all([getI18n(), getLocationDirectory()]);
  filters = { ...filters, ilgi: [], sayfa: 1 };
  const result = await discoverProfiles(filters);
  const province = filters.il ? getProvince(filters.il) : undefined;
  const provinces = listProvinces().map(({ slug, name, country }) => ({ slug, name, country }));
  const districts = province ? listDistricts(province.plate).map(({ slug, name }) => ({ slug, name })) : [];
  const filterProps = { mode, filters, provinces, districts, total: result.total };
  const location = mode.type === "location";
  const regionHref = location ? localizedPath(lang, "location", { country: mode.country, region: mode.il }) : null;

  return (
    <div className="lg:grid lg:grid-cols-[12rem_1fr] lg:gap-x-6 xl:grid-cols-[12rem_1fr] xl:gap-x-8">
      <FilterRail {...filterProps} />
      <div className="min-w-0 space-y-8">
        <FilterBar {...filterProps} />
        <h2 className="sr-only">{m.listing.heading}</h2>
        {result.items.length ? (
          <ProgressiveProfiles key={JSON.stringify(filters)} initial={result} filters={filters} />
        ) : hasActiveFilters({ ...filters, ulke: location ? undefined : filters.ulke, il: location ? undefined : filters.il, ilce: location ? undefined : filters.ilce, yaka: location ? undefined : filters.yaka }) ? (
          <EmptyState
            icon={Users}
            title={m.listing.noMatchTitle}
            description={m.listing.noMatchDescription}
            action={
              <Button asChild variant="outline">
                <Link href={!location ? localizedPath(lang, "explore") : localizedPath(lang, "location", { country: mode.country, region: mode.il, locality: filters.ilce })}>{m.listing.reset}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={filters.ilce ? m.listing.emptyLocality : m.listing.emptyRegion}
            description={m.listing.emptyDescription}
            action={
              <Button asChild variant="outline">
                <Link href={filters.ilce && regionHref ? regionHref : localizedPath(lang, "cities")}>{filters.ilce ? m.listing.seeRegion : m.listing.otherCities}</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

export function ProfileListingSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[12rem_1fr] lg:gap-x-6 xl:grid-cols-[12rem_1fr] xl:gap-x-8">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}
      </div>
      <div className="space-y-8">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <ProfileGridSkeleton columns={4} count={6} />
      </div>
    </div>
  );
}
