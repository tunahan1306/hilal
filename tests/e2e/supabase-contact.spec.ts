/**
 * Yalnızca Supabase modunda (E2E_SUPABASE=1) ve YEREL Supabase'e karşı çalışır.
 * Doğrular: form gönderimi veritabanına yazılır, ham IP saklanmaz; tablo yokken
 * (migration uygulanmamış) kullanıcı teknik ayrıntı görmez.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
test.skip(!process.env.E2E_SUPABASE || !local, "Yerel Supabase modu gerekli");
test.describe.configure({ mode: "serial" });

const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-qc", q], { stdio: "pipe" });

// Paylaşılan sayaç sunucu yeniden başlasa da kalır (beklenen davranış); test kendi kayıtlarını temizler.
test.beforeAll(() => {
  sql("delete from public.rate_limit_buckets where key like 'contact%'; delete from public.contact_messages where email = 'sb-e2e@test.local';");
});

async function submit(page: Page, subject: string) {
  await page.goto("/tr/iletisim");
  await page.getByLabel("Ad soyad").fill("Supabase E2E");
  await page.getByLabel("E-posta").fill("sb-e2e@test.local");
  await page.getByLabel("Konu", { exact: true }).fill(subject);
  await page.getByLabel("Mesaj", { exact: true }).fill("Sentetik Supabase uçtan uca test mesajı; gerçek bir talep değildir.");
  await page.getByLabel(/Aydınlatma metnini okudum/).check();
  await page.waitForTimeout(2_100);
  await page.getByRole("button", { name: "Mesajı gönder" }).click();
}

test("gönderim contact_messages tablosuna yazılır; ham IP saklanmaz", async ({ page }) => {
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const subject = `SB E2E ${Date.now()}`;
  await submit(page, subject);
  await expect(page.getByRole("status").filter({ hasText: "Mesajınız alındı" })).toBeVisible();
  const { data, error } = await service.from("contact_messages").select("subject, ip_hash, status, read_at").eq("subject", subject);
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data![0].status).toBe("new");
  expect(data![0].read_at).toBeNull();
  expect(data![0].ip_hash).toMatch(/^[a-f0-9]{32}$/);
  expect(data![0].ip_hash).not.toMatch(/127\.0\.0\.1|::1/);
  await service.from("contact_messages").delete().eq("subject", subject);
});

test("tablo yokken (migration uygulanmamış) kullanıcı yalnızca nötr mesaj görür", async ({ page }) => {
  sql("alter table public.contact_messages rename to contact_messages_e2e_hidden; notify pgrst, 'reload schema';");
  try {
    await page.waitForTimeout(1_500); // PostgREST şema önbelleği
    await submit(page, `SB eksik ${Date.now()}`);
    const alert = page.locator('form [role="alert"]');
    await expect(alert).toContainText("İletişim formu şu anda kullanılamıyor");
    await expect(page.locator("body")).not.toContainText(/contact_messages|relation|PGRST|42P01|schema cache/i);
  } finally {
    sql("alter table public.contact_messages_e2e_hidden rename to contact_messages; notify pgrst, 'reload schema';");
  }
});
