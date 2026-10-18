import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"], display: "swap" });
// Yalnızca optik boyut ekseni: italik ve SOFT ekseni ~250 KB ek font indiriyordu (LCP).
// Biyografilerdeki italik vurgular tarayıcı tarafından sentezlenir.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin", "latin-ext"], axes: ["opsz"], style: ["normal"], display: "swap" });
// Mono yalnızca yönetim panelinde birkaç yerde kullanılır; her sayfada preload edilmez.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"], display: "swap", preload: false });

export const VIEWPORT = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF1F5" },
    { media: "(prefers-color-scheme: dark)", color: "#190D1B" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

/** Ziyaretçi (app/[lang]) ve yönetim (app/admin) kök layout'larının ortak HTML kabuğu. */
export function RootDocument({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
