import "server-only";

/** Supabase yapılandırılmamışsa uygulama sentetik verilerle "demo" modunda çalışır. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

/**
 * Production'da demo modu yalnızca açıkça izin verilirse çalışır; böylece
 * yanlış yapılandırılmış bir canlı ortam sessizce sahte verilerle açılmaz.
 */
export function assertDemoAllowed(): void {
  if (isDemoMode() && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_MODE !== "true") {
    throw new Error(
      "Supabase yapılandırması eksik. Production'da demo modu için ALLOW_DEMO_MODE=true ayarlanmalı.",
    );
  }
}

export function requiredSecret(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length >= 32) return v;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_MODE !== "true") {
    throw new Error(`${name} en az 32 karakter olmalı`);
  }
  return devFallback;
}
