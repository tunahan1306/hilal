import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ViewsChart } from "@/components/admin/views-chart";
import { getLocationDirectory } from "@/server/queries/locations";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export const metadata: Metadata = { title: "İstatistikler" };

export default async function StatsPage() {
  await requireAdmin();
  const { getProvinceByPlate } = await getLocationDirectory();
  const repo = getRepository();
  const [views30, counts] = await Promise.all([repo.getDailyViews(30), repo.countPublishedByLocation()]);
  const cities = counts.filter((c) => c.districtSlug === null).sort((a, b) => b.count - a.count).slice(0, 10);
  const max = Math.max(1, ...cities.map((c) => c.count));
  return (
    <>
      <PageHeader title="İstatistikler" description="Profil görüntülemeleri, aynı ziyaretçi ve profil için saatte bir kez sayılır. Kişisel veri tutulmaz." />
      <section className="mb-6 rounded-lg border border-hairline p-5"><ViewsChart data={views30} label="Toplam profil görüntülemesi (son 30 gün)" /></section>
      <section className="rounded-lg border border-hairline p-5">
        <h2 className="mb-4 text-sm font-medium">İllere göre yayındaki profiller</h2>
        <ul className="space-y-2">
          {cities.map((c) => (
            <li key={c.plate} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span>{getProvinceByPlate(c.plate)?.name}</span>
              <span className="h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-chart-1" style={{ width: `${(c.count / max) * 100}%` }} /></span>
              <span className="text-right tabular-nums">{c.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
