import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { CrescentMark } from "./logo";

export async function NotFoundContent({ variant = "default" }: { variant?: "default" | "location" }) {
  const { lang, m } = await getI18n();
  return (
    <div className="container-page flex flex-1 flex-col justify-center py-24">
      <p className="eyebrow flex items-center gap-2 text-muted-foreground"><CrescentMark className="size-4" /> 404</p>
      <h1 className="font-display mt-5 text-display-xl">{m.notFound.title}</h1>
      <p className="mt-4 max-w-md text-lede text-muted-foreground">{variant === "location" ? m.notFound.descriptionLocation : m.notFound.description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={localizedPath(lang, "explore")} className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground">{m.notFound.explore}</Link>
        <Link href={localizedPath(lang, "cities")} className="inline-flex h-11 items-center rounded-md border border-hairline px-5 text-sm">{m.notFound.cities}</Link>
      </div>
    </div>
  );
}
