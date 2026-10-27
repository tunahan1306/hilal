import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AGE_COOKIE, AGE_COOKIE_VALUE } from "@/domain/age-confirmation";
import { DEFAULT_LOCALE, isLocale, negotiateLocale, type Locale } from "@/i18n/config";
import { internalPath, legacyRedirect, localizedPath, parseLocalized, type ParsedPath } from "@/i18n/routes";
import { validLocation, validPublicProfile } from "@/server/location-path";

/** Ziyaretçinin dil tercihi (yalnızca kök adresin yönlendirmesi için; konumdan bağımsız). */
const LANG_COOKIE = "hilal_lang";
/** Yaş kapısının arkasındaki rotalar (profil içeriği gösterenler). */
const GATED = new Set<ParsedPath["route"]>(["home", "explore", "location", "profile"]);
/** Modül A — son kullanıcı hesap alanı: admin gibi dil önek mantığının dışında, henüz yerelleştirilmemiş statik rotalar. */
const USER_AREA_PATHS = ["/giris", "/kayit", "/hesap", "/dogrula", "/kullanici"];

/**
 * Proxy:
 * 1. Eski öneksiz Türkçe adresler → yeni yerel adres (301).
 * 2. Kök `/` → tercih edilen dil (çerez, yoksa Accept-Language), 307.
 * 3. Yerel adres → iç rota (rewrite); yanlış dil segmenti → 301; tanınmayan → 404.
 * 4. Konum ve profil adresleri doğrulanır (gerçek 404); yaş kapısı uygulanır.
 * 5. Yönetim: yalnızca iyimser oturum kontrolü (asıl yetki her sayfada ve Server Action'da sunucuda).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) return adminProxy(request);
  if (USER_AREA_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const media = pathname.startsWith("/demo/") || pathname.startsWith("/media/") || pathname === "/_next/image";
  if (media) {
    if (request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) return new NextResponse(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (pathname === "/") {
    const saved = request.cookies.get(LANG_COOKIE)?.value;
    // Eski ana sayfa sorguları (ör. ?yaka=) Türkçe sayfaya aittir.
    const lang: Locale = search ? DEFAULT_LOCALE : isLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language"));
    const response = NextResponse.redirect(new URL(`/${lang}${search}`, request.url), 307);
    response.headers.set("Vary", "Accept-Language, Cookie");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const legacy = legacyRedirect(pathname);
  if (legacy) return NextResponse.redirect(new URL(`${legacy}${search}`, request.url), 301);

  const parsed = parseLocalized(pathname);
  if (!parsed) {
    // Dosya (public/ altındaki varlıklar) ise dokunma; aksi halde dil öneki olmayan bilinmeyen sayfa:
    // [lang] köküne düşüp İngilizce varsayılan 404'e gitmesin, ziyaretçinin dilinde gerçek 404 dönsün.
    if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return NextResponse.next();
    const saved = request.cookies.get(LANG_COOKIE)?.value;
    return notFoundPage(request, isLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language")));
  }
  if (parsed.kind === "redirect") return NextResponse.redirect(new URL(`${parsed.to}${search}`, request.url), 301);
  if (parsed.kind === "unknown") return notFoundPage(request, parsed.lang);

  const { lang, route, tail } = parsed.parsed;
  // Yalnızca konum ve profil rotaları ek segment alır.
  const maxTail = route === "location" ? 3 : route === "profile" ? 1 : 0;
  if (tail.length > maxTail || (route === "profile" && tail.length !== 1) || (route === "location" && tail.length === 0)) return notFoundPage(request, lang);

  if (route === "location") {
    const valid = await validLocation(tail[0]!, tail[1], tail[2]);
    if (valid === null) return new NextResponse("Location data is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    if (!valid) return notFoundPage(request, lang);
  }

  // Ülke dizini (/tr/konum/nl) yalnızca bölge adları ve sayıları gösterir: kapı dışında, indekslenebilir.
  const gated = GATED.has(route) && !(route === "location" && tail.length === 1);
  if (gated && request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) {
    const target = new URL(internalPath(lang, "age"), request.url);
    target.searchParams.set("returnTo", pathname + search);
    const response = NextResponse.rewrite(target);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Yaş onaylı ziyaretçide olmayan/kaldırılmış profil gerçek 404 alır (soft 404 yok).
  if (route === "profile" && (await validPublicProfile(tail[0]!)) === false) return notFoundPage(request, lang);

  const target = new URL(`${parsed.internal}${search}`, request.url);
  const response = target.pathname === pathname ? NextResponse.next() : NextResponse.rewrite(target);
  if (gated) response.headers.set("Cache-Control", "private, no-store");
  if (request.cookies.get(LANG_COOKIE)?.value !== lang) {
    response.cookies.set(LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, secure: request.nextUrl.protocol === "https:" });
  }
  return response;
}

async function adminProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

/** rewrite() durum kodunu korumadığından yerel 404 sayfası 404 koduyla döndürülür. */
async function notFoundPage(request: NextRequest, lang: Locale) {
  const page = await fetch(new URL(localizedPath(lang, "notFound"), request.url), { headers: { accept: "text/html", cookie: request.headers.get("cookie") ?? "" } });
  return new NextResponse(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

export const config = {
  // Statik dosyalar, API ve meta dosyaları hariç tüm adresler (yönlendirme, dil, yaş kapısı).
  matcher: ["/((?!api/|_next/static|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image).*)", "/_next/image"],
};
