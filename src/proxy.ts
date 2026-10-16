import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDistrict, getProvince } from "@/domain/locations";

/**
 * Yalnızca iyimser kontrol: yönetim sayfalarına oturum çerezi olmadan gelen
 * istekleri giriş sayfasına yönlendirir ve Supabase oturum çerezlerini yeniler.
 * Asıl yetkilendirme her sayfada ve Server Action'da `requireAdmin()` /
 * `assertAdmin()` ile sunucuda yapılır.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Geçersiz il/ilçe slug'ları için gerçek 404 (akış başlamadan önce).
  if (pathname.startsWith("/sehir/")) {
    const [, , il, ilce, ...rest] = pathname.split("/");
    const valid = rest.length === 0 && getProvince(il ?? "") && (!ilce || getDistrict(il!, ilce));
    if (valid) return NextResponse.next();
    // rewrite() durum kodunu korumadığından statik 404 sayfası 404 koduyla döndürülür.
    const page = await fetch(new URL("/bulunamadi", request.url), { headers: { accept: "text/html" } });
    return new NextResponse(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (pathname.startsWith("/admin/giris")) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/admin/giris", request.url));
    return response;
  }

  if (!request.cookies.get("hilal_admin")) {
    return NextResponse.redirect(new URL("/admin/giris", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/sehir/:path*"],
};
