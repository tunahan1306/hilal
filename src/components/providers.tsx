"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

/**
 * Hareketler yalnızca CSS ile yapılır ve `prefers-reduced-motion` CSS'te
 * sıfırlanır; istemci paketine kullanılmayan sağlayıcılar eklenmez.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
