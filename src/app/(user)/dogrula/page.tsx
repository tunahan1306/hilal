import type { Metadata } from "next";
import { Logo } from "@/components/site/logo";
import { isSupabaseConfigured } from "@/server/env";
import { VerifyEmailForm } from "./verify-form";

export const metadata: Metadata = { title: "E-posta doğrulama" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token_hash === "string" ? sp.token_hash : typeof sp.token === "string" ? sp.token : "";
  const email = typeof sp.email === "string" ? sp.email : "";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-paper p-6 sm:p-8">
        <Logo href="/" className="mb-8" />
        <h1 className="text-xl font-semibold tracking-tight">E-posta doğrulama</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          {isSupabaseConfigured() ? "E-postanızdaki bağlantı sizi buraya yönlendirmiş olmalı." : "Kayıt sırasında gösterilen demo jetonunu girin."}
        </p>
        <VerifyEmailForm defaultToken={token} defaultEmail={email} />
      </div>
    </main>
  );
}
