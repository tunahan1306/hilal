import { NextRequest, NextResponse } from "next/server";
import { AGE_COOKIE, AGE_COOKIE_VALUE } from "@/domain/age-confirmation";
import { decodeCursor } from "@/domain/discovery-cursor";
import { parseFilters } from "@/domain/filters";
import { getLocationDirectory } from "@/server/queries/locations";
import { discoverProfiles } from "@/server/queries/public";
import { clientFingerprint, sharedRateLimit } from "@/server/rate-limit";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) return NextResponse.json({ error: "Yaş onayı gerekli." }, { status: 403, headers });
  // Toplu veri (ör. iletişim numarası) çekmeyi zorlaştırır; normal "daha fazla göster" kullanımının çok üstünde.
  const limit = await sharedRateLimit(`discovery:${await clientFingerprint()}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Çok fazla istek." }, { status: 429, headers: { ...headers, "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } });
  const { getProvince, getDistrict } = await getLocationDirectory();
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
