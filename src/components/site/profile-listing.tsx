import Link from "next/link";
import { Users } from "lucide-react";
import { hasActiveFilters, serializeFilters, type ProfileFilters } from "@/domain/filters";
import { getProvince, listDistricts, listProvinces } from "@/domain/locations";
import { Button } from "@/components/ui/button";
import { getInterests, searchProfiles } from "@/server/queries/public";
import { EmptyState } from "./empty-state";
import { FilterBar, FilterRail, type FilterMode } from "./filter-bar";
import { Pagination } from "./pagination";
import { ProfileGrid, ProfileGridSkeleton } from "./profile-grid";

/** Keşfet, il ve ilçe sayfalarının ortak listeleme bölümü. */
export async function ProfileListing({ filters, mode }: { filters: ProfileFilters; mode: FilterMode }) {
  const [result, interests] = await Promise.all([searchProfiles(filters), getInterests()]);
  const province = filters.il ? getProvince(filters.il) : undefined;
  const provinces = listProvinces().map(({ slug, name }) => ({ slug, name }));
  const districts = province ? listDistricts(province.plate).map(({ slug, name }) => ({ slug, name })) : [];
  const basePath = mode.type === "explore" ? "/kesfet" : filters.ilce ? `/sehir/${mode.il}/${filters.ilce}` : `/sehir/${mode.il}`;
  const omit: (keyof ProfileFilters)[] = mode.type === "explore" ? [] : ["il", "ilce"];

  const filterProps = {
    mode,
    filters,
    provinces,
    districts,
    interests: interests.map(({ slug, name }) => ({ slug, name })),
    total: result.total,
  };

  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-x-12 xl:grid-cols-[16.5rem_1fr] xl:gap-x-16">
      <FilterRail {...filterProps} />
      <div className="min-w-0 space-y-8">
      <FilterBar {...filterProps} />
      <h2 className="sr-only">Profiller</h2>
      {result.items.length ? (
        <>
          <ProfileGrid profiles={result.items} columns={3} priorityCount={filters.sayfa === 1 ? 2 : 0} />
          <Pagination
            page={filters.sayfa}
            total={result.total}
            hrefFor={(sayfa) => `${basePath}${serializeFilters({ ...filters, sayfa }, omit)}`}
          />
        </>
      ) : (
        hasActiveFilters({ ...filters, il: mode.type === "location" ? undefined : filters.il, ilce: mode.type === "location" ? undefined : filters.ilce }) ? (
          <EmptyState
            icon={Users}
            title="Bu kriterlere uygun profil bulunamadı"
            description="Filtreleri genişletmeyi veya yakındaki bir şehri denemeyi düşünebilirsiniz."
            action={
              <Button asChild variant="outline">
                <Link href={mode.type === "explore" ? "/kesfet" : filters.ilce ? `/sehir/${mode.il}/${filters.ilce}` : `/sehir/${mode.il}`}>Filtreleri sıfırla</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={filters.ilce ? "Bu ilçede henüz yayında profil yok" : "Bu bölgede henüz yayında profil yok"}
            description="Profiller yalnızca rıza, yaş doğrulaması ve moderasyon tamamlandıktan sonra yayınlanır."
            action={
              <Button asChild variant="outline">
                <Link href={filters.ilce && mode.type === "location" ? `/sehir/${mode.il}` : "/sehirler"}>
                  {filters.ilce ? "İlin tamamına bak" : "Diğer şehirlere göz at"}
                </Link>
              </Button>
            }
          />
        )
      )}
      </div>
    </div>
  );
}

export function ProfileListingSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-x-12 xl:grid-cols-[16.5rem_1fr] xl:gap-x-16">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}
      </div>
      <div className="space-y-8">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <ProfileGridSkeleton columns={3} count={6} />
      </div>
    </div>
  );
}
