import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AGE_COOKIE, AGE_COOKIE_VALUE } from "@/domain/age-confirmation";
import { validLocation, validPublicProfile } from "@/server/location-path";

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
    const valid = rest.length === 0 ? await validLocation(il ?? "", ilce) : false;
    if (valid === null) return new NextResponse("Konum bilgileri şu anda yüklenemiyor.", { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    if (!valid) return notFoundPage(request);
  }

  const restricted = pathname === "/" || pathname === "/kesfet" || pathname.startsWith("/sehir/") || pathname.startsWith("/profil/");
  const media = pathname.startsWith("/demo/") || pathname.startsWith("/media/") || pathname === "/_next/image";
  if ((restricted || media) && request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) {
    if (media) return new NextResponse(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    const target = new URL("/yas-onayi", request.url);
    target.searchParams.set("returnTo", pathname + request.nextUrl.search);
    const response = NextResponse.rewrite(target);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  // Yaş onaylı ziyaretçide olmayan/kaldırılmış profil gerçek 404 alır (soft 404 yok).
  if (pathname.startsWith("/profil/")) {
    const [, , slug, ...rest] = pathname.split("/");
    const valid = rest.length === 0 ? await validPublicProfile(slug ?? "") : false;
    if (valid === false) return notFoundPage(request);
  }

  if (!pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    if (restricted || media) response.headers.set("Cache-Control", "private, no-store");
    return response;
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

/** rewrite() durum kodunu korumadığından statik 404 sayfası 404 koduyla döndürülür. */
async function notFoundPage(request: NextRequest) {
  const page = await fetch(new URL("/bulunamadi", request.url), { headers: { accept: "text/html" } });
  return new NextResponse(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

export const config = {
  matcher: ["/", "/kesfet", "/profil/:path*", "/admin/:path*", "/sehir/:path*", "/demo/:path*", "/media/:path*", "/_next/image"],
};
