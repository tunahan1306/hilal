import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function RegisterPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-paper p-6 sm:p-8">
        <Logo href="/" className="mb-8" />
        <h1 className="text-xl font-semibold tracking-tight">Hesap oluştur</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          18 yaşından büyük olmalısınız. Kayıt, yaş doğrulamasını tamamlamanızı gerektirir.
        </p>
        <RegisterForm />
        <p className="mt-6 text-sm text-muted-foreground">
          Zaten hesabınız var mı? <Link href="/giris" className="font-medium text-foreground underline underline-offset-4">Giriş yapın</Link>
        </p>
      </div>
    </main>
  );
}
