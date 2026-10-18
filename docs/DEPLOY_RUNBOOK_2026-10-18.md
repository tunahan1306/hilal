# Hilal: Production'a geçiş runbook'u (PR #1)

Bu belge **sizin** uygulayacağınız Supabase adımlarını ve her adımın doğrulamasını içerir. Hiçbir adım otomatik çalıştırılmadı.

**Kural:** şifre ve bağlantı dizesini sohbete yapıştırmayın. Komutlar değerleri yalnızca kendi terminalinizdeki ortam değişkenlerinden okur.

Sıra:
1. Yedek
2. Preview projesi ve Vercel ayrımı
3. Preview'da uçtan uca test
4. Production migration'ları
5. Merge ve deploy

**Her bölümün sonunda bir onay noktası var.**

---

## 0. Bilinen durum (2026-10-18, yalnızca okuma ile doğrulandı)

| Nesne | Production |
|---|---|
| `contact_messages` (0001) | **yok** |
| `rate_limit_buckets`, `rate_limit_*` fonksiyonları (0003) | **yok** |
| 0002'nin güncelleyeceği satır | **0** (`profile_media` boş) |
| Yayında gerçek profil / medya / KVKK talebi | 0 / 0 / 0 |
| Görünür örnek profil | 10 (C-01, kapsam dışı; dokunulmayacak) |
| `ALLOW_DEMO_MODE` | `false` |
| Preview ↔ Production Supabase değişkenleri | **aynı** (V-01) |

---

## 1. Production yedeği (zorunlu; doğrulanmadan sonraki adımlara geçilmez)

### 1A. Panelden kontrol
1. Supabase Dashboard → production projesi → **Database → Backups**.
2. Plan **Pro** ise son günlük yedeğin tarihini not edin. Point-in-time recovery açıksa onu da not edin.
3. Plan **Free** ise otomatik yedek yoktur (DEPLOYMENT.md). 1B **zorunludur**.

### 1B. Mantıksal yedek (kendi Terminal uygulamanızda; Claude oturumunda `!` ile değil)
Komutlar yerel test veritabanında 2026-10-18'de denendi. Docker açık olmalı; `supabase db dump`, sunucu sürümüne uygun `pg_dump`'ı container içinde çalıştırır. Yereldeki `pg_dump` 14, Postgres 17 için eskidir.

Bağlantı dizesi: Dashboard → **Connect** (veya Project Settings → Database) → **Session pooler** URI. Şifrede `@ : / ? #` varsa yüzde-kodlu yazılmalıdır.

```bash
# 1) Kısıtlı izinli klasör
umask 077 && mkdir -p ~/hilal-backup-2026-10-18 && cd ~/hilal-backup-2026-10-18

# 2) Bağlantı dizesini görünmez biçimde okuyun. Ekrana ve shell geçmişine düşmez.
#    Komutu çalıştırınca hiçbir şey görünmez: URI'yi yapıştırıp Enter'a basın.
read -rs PROD_DB_URL && export PROD_DB_URL && echo "okundu (uzunluk: ${#PROD_DB_URL})"

# 3) Döküm (her biri yalnızca "Dumping … / Dumped schema to …" yazar)
SB=~/Projeler/hilal/node_modules/.bin/supabase
$SB db dump --db-url "$PROD_DB_URL" --file roles.sql  --role-only
$SB db dump --db-url "$PROD_DB_URL" --file schema.sql
$SB db dump --db-url "$PROD_DB_URL" --file data.sql   --use-copy --data-only

# 4) Değişkeni silin, bütünlük özetini alın
unset PROD_DB_URL
shasum -a 256 roles.sql schema.sql data.sql > SHA256SUMS
ls -la && grep -c '^COPY ' data.sql
```
**Beklenen:**
- 3. adımdaki üç komut da `Dumped schema to …` ile biter.
- `ls` çıktısında üç `.sql` ve `SHA256SUMS` görünür, `schema.sql` boyutu 0'dan büyüktür.
- `grep` 1'den büyük bir sayı verir (tablo sayısı).

Hata çıkarsa yalnızca hata satırını iletin. CLI hata metninde bağlantı dizesini yazmaz; yine de yapıştırmadan önce kontrol edin.

Not: `--db-url` değeri komut çalışırken yerel süreç listesinde (`ps`) görünür. Paylaşılan bir makinede çalıştırmayın.

### 1C. Depolama (fotoğraf/video) yedeği
Veritabanı dökümü kova dosyalarını içermez. Bugün `profile_media` boş. Kurgusal profillerin görselleri kova veya dış adreste olabilir. Hızlı kontrol için **Storage** → `media-public`, `profile-images`, `media-private` kovalarına bakın. Dosya varsa panelden indirin; bu migration'lar dosyalara dokunmaz.

### 1D. Yedeğin doğrulanması (benim yapacağım; veri makinenizden çıkmaz)
"Yedek hazır" yazdığınızda şu komutu çalıştırırım:
```bash
scripts/runbook/verify-production-backup.sh ~/hilal-backup-2026-10-18
```
Komut şunları yapar:
1. **Ayrı, geçici bir yerel Supabase yığını** başlatır: Postgres 17.11, `project_id=hilal-restore-check`, portlar 554xx. Auth ve storage servisleri kendi şemalarını oluşturur; test veritabanından tamamen ayrıdır.
2. Veriyi yüklemeden önce yığını sıkılaştırır: API servislerini (kong, rest, auth, storage) durdurur, veritabanı şifrelerini rastgele değerlerle değiştirir.
3. `SHA256SUMS` doğrular. Ardından roller ve şemayı tek transaction'da yükler, veriyi tablo tablo yükler ve her tablonun satır sayısını döküm dosyasıyla karşılaştırır. Tek bir uyuşmazlık "doğrulanmadı" demektir.
4. Bittiğinde yığını **volume'larıyla birlikte siler**; production verisinin kopyası kalmaz.

Çıktıda yalnızca tablo adları ve satır sayıları görünür, kişisel veri görünmez.

Prova (2026-10-18, yerel test veritabanı yedeğiyle): **57/57 tablo birebir**, "SONUÇ: YEDEK DOĞRULANDI", sonrasında 0 container ve 0 volume kaldı.

Yedek dosyaları kişisel veri içerebilir. Şifreli bir diskte saklayın, repoya koymayın, işiniz bitince güvenli silin.

> **Onay noktası 1:** yedek alındı ve 1D doğrulaması geçti.

---

## 2. Preview için ayrı Supabase projesi (V-01)

### 2A. Projeyi oluşturun (Dashboard)
1. **New project** → ad: `hilal-preview` → bölge: production ile aynı (eu-central-1 önerilir) → güçlü veritabanı şifresi (bir parola yöneticisine kaydedin).
2. **Authentication → Providers:** yalnızca Email açık; **Enable sign ups: kapalı**. **Auth → MFA:** TOTP açık.

### 2B. Şemayı uygulayın (kendi terminalinizde; production değil)
```bash
read -rs PREVIEW_DB_URL && export PREVIEW_DB_URL     # hilal-preview → Connection string → URI
cd ~/Projeler/hilal
git switch feat/site-audit-contact && git pull
npx supabase db push --db-url "$PREVIEW_DB_URL" --include-all --dry-run   # önce listeyi görün: 10 migration
npx supabase db push --db-url "$PREVIEW_DB_URL" --include-all             # 0001–0003 dahil tümü
psql "$PREVIEW_DB_URL" -f supabase/seed.sql                      # il/ilçe/ilgi/paket
unset PREVIEW_DB_URL
```
Not: `psql` 14 bu adım için yeterlidir; yalnızca SQL çalıştırır.

### 2C. Preview yönetici hesabı
`DEPLOYMENT.md → İlk yönetici` adımlarını **hilal-preview** projesinde uygulayın (Authentication → Add user → SQL ile `admins` satırı). İlk girişte TOTP kurulumu zorunludur.

### 2D. Vercel ortam değişkenleri (ayrım)
Şu an her değişken tek kayıt hâlinde "Production, Preview" hedefinde. Plan:

| Değişken | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | mevcut değer (değişmez) | **hilal-preview** değerleri |
| `IP_HASH_SALT`, `CRON_SECRET` | mevcut değer (değişmez) | yeni rastgele değer |
| `NEXT_PUBLIC_SITE_URL`, `ALLOW_DEMO_MODE=false`, `VERIFICATION_DOC_RETENTION_DAYS` | mevcut | aynı kalabilir |

**Benim yapacağım** (onayınızdan sonra; production değerleri değişmez):
1. Önce/sonra karşılaştırması için production değerlerinin özetini alırım.
2. Üç Supabase değişkeni ile `IP_HASH_SALT` ve `CRON_SECRET` kayıtlarında hedefi Vercel API ile yalnızca **Production** yaparım. Kayıtlar silinmez, değerler değişmez.
3. Preview için `IP_HASH_SALT` ve `CRON_SECRET` değerlerini rastgele üretip ekleyerek ekranda göstermem.
4. Production değerlerinin değişmediğini özetle doğrularım.

**Sizin yapacağınız:** Vercel → Project → Settings → Environment Variables → **Add**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Sensitive)

Ortam olarak yalnızca **Preview** seçin, değerleri hilal-preview → Project Settings → API'den alın. Panel yerine terminalde `vercel env add NEXT_PUBLIC_SUPABASE_URL preview` da kullanılabilir; değer istemde girilir, ekrana yazılmaz.

**Eski preview deploy'ları:** `hilal-dtz5abesc…` ve `hilal-efk04jbmn…` deploy-anı değişkenleriyle hâlâ production veritabanına bağlıdır. Yeni preview hazır olunca bu ikisinin silinmesini öneririm (Vercel → Deployments → ⋯ → Delete; production deploy'larına dokunulmaz). Onay verirseniz ben de silebilirim.

> **Onay noktası 2:** hilal-preview hazır; Vercel ayrımı yapıldı; eski preview'lar kaldırıldı.

---

## 3. Preview'da uçtan uca test (benim yapacağım)

Yeni preview deploy'u (PR #1, yalnızca hilal-preview veritabanı) üzerinde:
- İletişim formu gönderimi → `/admin/iletisim` → okundu → durum değiştirme → silme, ve denetim kayıtları.
- Yetki: oturumsuz, MFA'sız (aal1) ve yetkisiz oturumun reddedilmesi; Server Action tekrar oynatma.
- Oran sınırı: tekrar gönderim ve sınır uyarısı (paylaşılan sayaç).
- Sayfalar, 404, sitemap, robots, konsol ve ağ hataları, mobil görünüm.

Preview Vercel Authentication arkasında olduğu için erişimi `vercel curl` veya Vercel'in protection-bypass mekanizmasıyla yaparım. Bunun için bypass sırrı gerekirse sizden sohbete yazmanızı değil, ortam değişkeni olarak tanımlamanızı isterim.

> **Onay noktası 3:** preview testleri geçti.

---

## 4. Production migration'ları (SQL Editor; sizin yapacağınız)

Dashboard → production projesi → **SQL Editor → New query**. Her bloğu ayrı çalıştırın ve sonucu not edin.

**Prova:** bu bölümün tamamı (geri alma → ön kontrol → üç dosyanın `begin/commit` ile uygulanması → doğrulama → geçmiş kaydı → tekrar çalıştırma koruması) yerel Supabase'de `scripts/runbook/rehearse-migrations-local.sh` ile 2026-10-18'de çalıştırıldı. Tüm sonuçlar beklenen değerleri verdi. Yanlışlıkla tekrar çalıştırma `type "contact_category" already exists` hatasıyla durur ve hiçbir şeyi değiştirmez.

### 4.0 Ön kontrol (yalnızca okuma)
```sql
-- A) Migration geçmişi (tablo yoksa "does not exist" hatası normaldir)
select version, name from supabase_migrations.schema_migrations order by version;

-- B) Hedef nesneler: üçü de NULL olmalı
select to_regclass('public.contact_messages')                           as contact_messages,
       to_regclass('public.rate_limit_buckets')                         as rate_limit_buckets,
       to_regprocedure('public.rate_limit_hit(text,integer,integer)')   as rate_limit_hit;

-- C) Bağımlılıklar: citext, set_updated_at, is_admin mevcut olmalı
select (select count(*) from pg_extension where extname = 'citext')                                   as citext,
       (select count(*) from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) as set_updated_at,
       (select count(*) from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace)       as is_admin;

-- D) 0002'nin etkileyeceği satır sayısı (bugün 0 bekleniyor)
select count(*) from public.profile_media
where public_url like '%/storage/v1/object/public/profile-images/%'
  and coalesce(array_length(public_paths, 1), 0) = 0;
```
Beklenen: B'de üç NULL; C'de üç değer de ≥1; D = 0. A'da 0001–0003 **olmamalı**. Varsa durun, bana yazın; tekrar çalıştırmayın.

### 4.1 `20261023000001_contact_messages.sql`
Dosyanın tamamını kopyalayın (repo: `supabase/migrations/20261023000001_contact_messages.sql`, PR #1). SQL Editor'da şu şekilde çalıştırın:
```sql
begin;
-- <<< dosya içeriği buraya >>>
commit;
```
Hata alırsanız `rollback;` çalıştırın ve bana hata metnini yazın. Hata metni bağlantı bilgisi içermez.

**Doğrulama:**
```sql
select relrowsecurity as rls_acik from pg_class where oid = 'public.contact_messages'::regclass;               -- true
select polname, polcmd, polroles::regrole[] from pg_policy where polrelid = 'public.contact_messages'::regclass; -- "admin all contact_messages", *, {authenticated}
select has_table_privilege('anon', 'public.contact_messages', 'select') as anon_okuma,
       has_table_privilege('anon', 'public.contact_messages', 'insert') as anon_yazma;                           -- false, false
select count(*) as indeks from pg_indexes where schemaname = 'public' and tablename = 'contact_messages';        -- 4
select tgname from pg_trigger where tgrelid = 'public.contact_messages'::regclass and not tgisinternal;         -- contact_messages_updated_at
```

### 4.2 `20261023000002_legacy_media_paths.sql`
Aynı şekilde `begin; … commit;` ile çalıştırın. Çıktıda `UPDATE 0` beklenir (4.0-D ile aynı sayı).

**Doğrulama:**
```sql
select count(*) from public.profile_media where public_paths[1] like 'legacy-profile-images:%';   -- 4.0-D ile aynı (0)
```

### 4.3 `20261023000003_shared_rate_limits.sql`
`begin; … commit;` ile çalıştırın.

**Doğrulama:**
```sql
select relrowsecurity as rls_acik from pg_class where oid = 'public.rate_limit_buckets'::regclass;          -- true
select has_table_privilege('anon', 'public.rate_limit_buckets', 'select')                     as anon_tablo,  -- false
       has_function_privilege('anon', 'public.rate_limit_hit(text,integer,integer)', 'execute')          as anon_fn,  -- false
       has_function_privilege('authenticated', 'public.rate_limit_hit(text,integer,integer)', 'execute') as auth_fn,  -- false
       has_function_privilege('service_role', 'public.rate_limit_hit(text,integer,integer)', 'execute')  as svc_fn;   -- true
-- Davranış: ilk çağrı izinli, ikinci çağrı engelli, sonra temizlik
select * from public.rate_limit_hit('runbook:kontrol', 1, 60);   -- allowed = true
select * from public.rate_limit_hit('runbook:kontrol', 1, 60);   -- allowed = false
select public.rate_limit_clear('runbook:kontrol');
select count(*) from public.rate_limit_buckets;                   -- 0
```

### 4.4 Migration geçmişine kayıt (yalnızca 4.0-A'daki tablo varsa)
SQL Editor ile uygulanan migration'lar geçmişe otomatik yazılmaz. Kaydetmezseniz ileride `supabase db push` bunları tekrar çalıştırmaya çalışır.
```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20261023000001', 'contact_messages'),
       ('20261023000002', 'legacy_media_paths'),
       ('20261023000003', 'shared_rate_limits')
on conflict (version) do nothing;
select version from supabase_migrations.schema_migrations where version like '20261023%';   -- 3 satır
```

### 4.5 Geri dönüş (yalnızca gerekirse)
`FULL_SITE_AUDIT_2026-10-18.md → §17.5` (ters sırayla 0003 → 0002 → 0001). 0001'in geri alınması iletişim mesajlarını siler; önce dışa aktarın. Uygulama tarafında geri dönüş: Vercel'de önceki production deploy'unu (`46049a2`) **Promote**.

> **Onay noktası 4:** tüm doğrulama sorguları beklenen sonucu verdi. Çıktıları bana iletin; bağlantı bilgisi içermezler.

---

## 5. Merge ve deploy (benim yapacağım; onay noktası 4'ten sonra)
1. PR #1'i merge ederim (merge commit). Vercel production deploy'unu izlerim.
2. Production smoke testleri: ana sayfa, şehir, ilçe, profil, iletişim, `/admin/giris`, sitemap, robots, 404.
3. İletişim: production'a tek bir test mesajı gönderirim → siz panelde görürsünüz (MFA'lı hesabınızla) → ben ya da siz kalıcı silme ile kaldırırsınız.
4. Sorun olursa: Vercel → önceki deploy → **Promote** (anında). Gerekirse §4.5.
