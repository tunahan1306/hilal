import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş yap" };

export default function UserLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-paper p-6 sm:p-8">
        <Logo href="/" className="mb-8" />
        <h1 className="text-xl font-semibold tracking-tight">Giriş yap</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Hesabınıza erişmek için e-posta ve şifrenizi girin.</p>
        <LoginForm />
        <p className="mt-6 text-sm text-muted-foreground">
          Hesabınız yok mu? <Link href="/kayit" className="font-medium text-foreground underline underline-offset-4">Kayıt olun</Link>
        </p>
      </div>
    </main>
  );
}
