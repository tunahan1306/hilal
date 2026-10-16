import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Çerez tabanlı Supabase istemcisi (yalnızca Auth işlemleri için). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, { ...options, sameSite: "lax", secure: process.env.NODE_ENV === "production", httpOnly: true });
          }
        } catch {
          // Server Component içinden çağrıldığında çerez yazılamaz; proxy oturumu yeniler.
        }
      },
    },
  });
}
