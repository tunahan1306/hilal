import { NextRequest, NextResponse } from "next/server";
import { AGE_COOKIE, AGE_COOKIE_VALUE } from "@/domain/age-confirmation";
import { decodeCursor } from "@/domain/discovery-cursor";
import { parseFilters } from "@/domain/filters";
import { getProvince, getDistrict } from "@/domain/locations";
import { discoverProfiles } from "@/server/queries/public";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) return NextResponse.json({ error: "Yaş onayı gerekli." }, { status: 403, headers });
  const params = request.nextUrl.searchParams;
  if (params.has("il") && !getProvince(params.get("il")!)) return NextResponse.json({ error: "Geçersiz konum." }, { status: 400, headers });
  const filters = parseFilters(Object.fromEntries(params));
  if ((filters.il && !getProvince(filters.il)) || (filters.ilce && !getDistrict(filters.il!, filters.ilce))) return NextResponse.json({ error: "Geçersiz konum." }, { status: 400, headers });
  const raw = params.get("cursor");
  const cursor = raw ? decodeCursor(raw) : undefined;
  if (raw && !cursor) return NextResponse.json({ error: "Geçersiz imleç." }, { status: 400, headers });
  try { return NextResponse.json(await discoverProfiles(filters, cursor ?? undefined), { headers }); }
  catch { return NextResponse.json({ error: "Profiller yüklenemedi." }, { status: 503, headers }); }
}
