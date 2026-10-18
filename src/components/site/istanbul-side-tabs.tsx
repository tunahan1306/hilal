import Link from "next/link";
import { ISTANBUL_SIDE_KEYS, type IstanbulSide } from "@/domain/istanbul";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** İstanbul Avrupa / Anadolu yaka seçimi; her sekme gerçek bir bağlantıdır. */
export async function IstanbulSideTabs({
  active,
  hrefFor,
  counts,
  allHref,
}: {
  active?: IstanbulSide;
  hrefFor: (side: IstanbulSide) => string;
  counts?: Partial<Record<IstanbulSide, number>>;
  /** Verilirse "Tüm İstanbul" sekmesi de gösterilir. */
  allHref?: string;
}) {
  const { m } = await getI18n();
  const tabs = [
    ...(allHref ? [{ key: "all", label: m.istanbul.all, href: allHref, current: !active, count: undefined }] : []),
    ...ISTANBUL_SIDE_KEYS.map((side) => ({ key: side, label: m.istanbul[side], href: hrefFor(side), current: active === side, count: counts?.[side] })),
  ];
  return (
    <nav aria-label={m.istanbul.nav} className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors",
            t.current ? "border-brand bg-brand text-brand-foreground" : "border-hairline bg-paper text-foreground hover:border-brand hover:text-brand",
          )}
        >
          {t.label}
          {t.count !== undefined ? <span className={cn("text-xs tabular-nums", t.current ? "opacity-80" : "text-muted-foreground")}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
