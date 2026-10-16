import { Suspense } from "react";
import type { Metadata } from "next";
import { AgeConfirmation } from "@/components/site/age-confirmation";
import { safeReturnPath } from "@/domain/age-confirmation";
export const metadata: Metadata = { title: "18+ yaş onayı", robots: { index: false, follow: true } };
export default function AgePage({ searchParams }: PageProps<"/yas-onayi">) {
  return <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: Pick<PageProps<"/yas-onayi">, "searchParams">) {
  const params = await searchParams;
  return <AgeConfirmation returnTo={safeReturnPath(params.returnTo)} declined={params.declined === "1"} />;
}
