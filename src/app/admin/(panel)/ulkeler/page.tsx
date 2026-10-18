import type { Metadata } from "next";
import { CountryDecisionForm } from "@/components/admin/country-decision-form";
import { PageHeader } from "@/components/admin/page-header";
import { COUNTRY_CODES, countryName, countryOfPlate } from "@/domain/countries";
import { isPublishable, PUBLICATION_STATUS_LABELS } from "@/domain/country-policy";
import { formatDate } from "@/lib/site";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { countryDecisionAction } from "../actions";

export const metadata: Metadata = { title: "Ülkeler ve yayın" };

export default async function CountriesPage() {
  const admin = await requireAdmin();
  const repo = getRepository();
  const [policies, decisions, profiles] = await Promise.all([repo.listCountryPolicies(), repo.listCountryDecisions(), repo.listProfiles()]);
  const now = new Date();
  return (
    <>
      <PageHeader
        title="Ülkeler ve yayın"
        description="Bir ülkede profil yayını yalnızca kayıtlı bir karar (sorumlu kişi, belge referansı, gözden geçirme tarihi) varsa açıktır. Konum verisinin var olması yayına izin vermez. Gözden geçirme tarihi geçen ülke kendiliğinden kapanır."
      />
      <div className="grid gap-6">
        {COUNTRY_CODES.map((code) => {
          const policy = policies.find((p) => p.code === code)!;
          const open = isPublishable(policy, now);
          const expired = policy.status === "permitted" && !open;
          const history = decisions.filter((d) => d.countryCode === code);
          const published = profiles.filter((p) => p.status === "published" && countryOfPlate(p.provincePlate) === code).length;
          return (
            <section key={code} className="rounded-lg border border-hairline p-5" aria-labelledby={`c-${code}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id={`c-${code}`} className="text-lg font-medium">{countryName(code, "tr")} <span className="text-sm text-muted-foreground">({code.toUpperCase()})</span></h2>
                <span className={cn("rounded-sm px-2 py-0.5 text-xs font-medium", open ? "bg-emerald-600/12 text-emerald-800 dark:text-emerald-300" : "bg-destructive/12 text-destructive")} data-testid={`country-status-${code}`}>
                  {open ? "Yayına açık" : expired ? "Süresi doldu — kapalı" : `${PUBLICATION_STATUS_LABELS[policy.status]} — kapalı`}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {policy.reviewDue ? `Gözden geçirme: ${formatDate(policy.reviewDue, { day: "numeric", month: "long", year: "numeric" })} · ` : ""}
                Yayın durumundaki profil: {published}{!open && published ? " (kamuya kapalı)" : ""}
              </p>
              {history.length ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm">Karar geçmişi ({history.length})</summary>
                  <ol className="mt-2 grid gap-2 text-sm">
                    {history.map((d) => (
                      <li key={d.id} className="rounded-md bg-muted/50 p-3">
                        <p><span className="font-medium">{PUBLICATION_STATUS_LABELS[d.status]}</span> · {formatDate(d.decidedAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {d.approverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.evidenceRef ? `Belge: ${d.evidenceRef}` : "Belge referansı yok"}
                          {d.reviewDue ? ` · Gözden geçirme: ${d.reviewDue}` : ""}
                          {d.restrictions ? ` · Kısıtlar: ${d.restrictions}` : ""}
                          {d.note ? ` · ${d.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : <p className="mt-4 text-sm text-muted-foreground">Kayıtlı karar yok.</p>}
              {admin.role === "owner" ? (
                <details className="mt-4 border-t border-hairline pt-4">
                  <summary className="cursor-pointer text-sm font-medium">Yeni karar kaydet</summary>
                  <div className="mt-4"><CountryDecisionForm action={countryDecisionAction} code={code} name={countryName(code, "tr")} /></div>
                </details>
              ) : <p className="mt-4 text-xs text-muted-foreground">Karar kaydı yalnızca sahip rolündeki yöneticiye açıktır.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
