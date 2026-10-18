import { NextRequest, NextResponse } from "next/server";
import { AGE_COOKIE, AGE_COOKIE_VALUE, AGE_MAX_AGE, safeReturnPath } from "@/domain/age-confirmation";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { localizedPath } from "@/i18n/routes";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const data = await request.formData();
  const accepted = data.get("decision") === "accept";
  const raw = data.get("lang");
  const lang = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const destination = accepted ? safeReturnPath(data.get("returnTo"), lang) : `${localizedPath(lang, "age")}?declined=1`;
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(AGE_COOKIE, accepted ? AGE_COOKIE_VALUE : "", {
    httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: accepted ? AGE_MAX_AGE : 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
