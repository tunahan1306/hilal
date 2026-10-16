import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/site/logo";
import { isDemoMode } from "@/server/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Yönetici girişi", robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }: PageProps<"/admin/giris">) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-paper p-6 sm:p-8">
        <Logo className="mb-8" />
        <h1 className="text-xl font-semibold tracking-tight">Yönetim paneli</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Yalnızca yetkili yöneticiler. Tüm girişler kayıt altına alınır.</p>
        <Suspense fallback={<div className="h-64" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/admin/giris">, "searchParams">) {
  const adim = (await searchParams).adim;
  const step = adim === "mfa" || adim === "mfa-kurulum" ? adim : "login";
  const demo = isDemoMode();
  return (
    <>
      <LoginForm step={step} demo={demo} />
      {demo && process.env.NODE_ENV !== "production" ? (
        <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Demo modu: bilgiler README.md içinde. TOTP kodu için <code>npm run demo:totp</code>.
        </p>
      ) : null}
    </>
  );
}
