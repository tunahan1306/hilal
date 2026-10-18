#!/usr/bin/env node
// İstemci paketine (.next/static) sunucu sırrı sızmadığını doğrular. Değerler ekrana YAZILMAZ.
// Kullanım: sırlar ortamdayken `next build` sonrası `node scripts/check-client-bundle.mjs`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";
const SECRET_ENV = ["SUPABASE_SERVICE_ROLE_KEY", "IP_HASH_SALT", "SESSION_SECRET", "CRON_SECRET", "DEMO_ADMIN_PASSWORD", "DEMO_ADMIN_TOTP_SECRET"];
const values = SECRET_ENV.map((k) => [k, process.env[k]]).filter(([, v]) => v && v.length >= 8);
const names = [...SECRET_ENV, "service_role"];

function* files(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(js|css|json|html|txt)$/.test(e)) yield p;
  }
}

let problems = 0, scanned = 0;
for (const f of files(ROOT)) {
  scanned++;
  const text = readFileSync(f, "utf8");
  for (const [k, v] of values) if (text.includes(v)) { console.error(`SIZINTI: ${k} değeri istemci dosyasında: ${f}`); problems++; }
  for (const n of names) if (text.includes(n)) { console.error(`UYARI: "${n}" adı istemci dosyasında: ${f}`); problems++; }
}
console.log(`istemci dosyası: ${scanned}, denetlenen sır değeri: ${values.length}, sorun: ${problems}`);
process.exit(problems ? 1 : 0);
