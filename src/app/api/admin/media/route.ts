import { NextRequest } from "next/server";
import { getAdminSession } from "@/server/auth/session";
import { memoryGet } from "@/server/storage/memory";
import { isDemoMode } from "@/server/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.aal !== "aal2") return new Response(null, { status: 403 });
  if (!isDemoMode()) return new Response(null, { status: 404 });
  const key = request.nextUrl.searchParams.get("path") ?? "";
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.includes("..") || key.startsWith("/")) return new Response(null, { status: 400 });
  const file = memoryGet("priv", key);
  let data = file?.data;
  if (!data && key.startsWith("demo/")) {
    try { data = await readFile(path.join(process.cwd(), "public", key)); } catch { /* Missing fixture. */ }
  }
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": file?.contentType ?? (key.endsWith(".webm") ? "video/webm" : "image/webp"), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
