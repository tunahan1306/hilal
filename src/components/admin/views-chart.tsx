import { formatDate, formatNumber } from "@/lib/site";

/** Erişilebilir, bağımlılıksız günlük ziyaret çubuk grafiği (tablo alternatifiyle). */
export function ViewsChart({ data, label }: { data: { day: string; views: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const total = data.reduce((s, d) => s + d.views, 0);
  return (
    <figure>
      <figcaption className="mb-3 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">Toplam {formatNumber(total)}</span>
      </figcaption>
      <div className="flex h-32 items-end gap-1" aria-hidden>
        {data.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="rounded-t-sm bg-chart-1/80 transition-colors group-hover:bg-chart-1" style={{ height: `${Math.max(2, (d.views / max) * 128)}px` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs shadow group-hover:block">
              {formatNumber(d.views)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>{formatDate(data[0]?.day ?? new Date().toISOString(), { day: "numeric", month: "short" })}</span>
        <span>{formatDate(data.at(-1)?.day ?? new Date().toISOString(), { day: "numeric", month: "short" })}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead><tr><th>Gün</th><th>Ziyaret</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.views}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
