import { NextRequest } from "next/server";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AGE_COOKIE, AGE_COOKIE_VALUE } from "@/domain/age-confirmation";
import { memoryGet } from "@/server/storage/memory";
import { isDemoMode } from "@/server/env";

// Bounded process cache; moderation still controls origin URLs and tagged page caches.
const optimized = new Map<string, Buffer>();
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const widths = new Set([16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1600, 1920, 2048, 2400, 3840]);
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (request.cookies.get(AGE_COOKIE)?.value !== AGE_COOKIE_VALUE) return new Response(null, { status: 403, headers });
  const src = request.nextUrl.searchParams.get("src") ?? "";
  const width = Number(request.nextUrl.searchParams.get("w"));
  const quality = Number(request.nextUrl.searchParams.get("q") ?? 75);
  if (!widths.has(width) || !Number.isInteger(quality) || quality < 40 || quality > 90) return new Response(null, { status: 400, headers });
  try {
    let data: Buffer;
    // Read the source even for a cached transform so removed public media cannot be served from this cache.
    if (/^\/demo\/[a-zA-Z0-9-]+\.webp$/.test(src) && isDemoMode()) {
      data = await readFile(path.join(process.cwd(), "public", src));
    } else if (/^\/media\/[a-f0-9-]+\.webp$/.test(src) && isDemoMode()) {
      const file = memoryGet("pub", src.slice("/media/".length));
      if (!file) return new Response(null, { status: 404, headers });
      data = file.data;
    } else {
      const source = new URL(src);
      const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!origin || source.origin !== new URL(origin).origin || !source.pathname.startsWith("/storage/v1/object/public/") || source.username || source.password) return new Response(null, { status: 400, headers });
      const response = await fetch(source, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok || Number(response.headers.get("content-length")) > MAX_SOURCE_BYTES) return new Response(null, { status: 404, headers });
      // Limit the streamed body before buffering to avoid unbounded remote inputs.
      const reader = response.body?.getReader();
      if (!reader) return new Response(null, { status: 404, headers });
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_SOURCE_BYTES) { await reader.cancel(); return new Response(null, { status: 413, headers }); }
        chunks.push(chunk.value);
      }
      data = Buffer.concat(chunks);
    }
    const key = `${src}|${width}|${quality}`;
    let result = optimized.get(key);
    if (!result) {
      result = await sharp(data, { limitInputPixels: 40_000_000 }).rotate().resize({ width: Math.min(width, 2400), withoutEnlargement: true }).webp({ quality }).toBuffer();
      if (optimized.size >= 64) optimized.delete(optimized.keys().next().value!);
      if (result.byteLength <= 512 * 1024) optimized.set(key, result);
    }
    return new Response(new Uint8Array(result), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return new Response(null, { status: 404, headers }); }
}
