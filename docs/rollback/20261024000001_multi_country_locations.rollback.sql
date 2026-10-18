-- GERİ ALMA: 20261024000001_multi_country_locations.sql
-- Migration klasöründe DEĞİLDİR; otomatik uygulanmaz. Yalnızca bilinçli geri dönüşte, önce izole bir
-- kopyada (scripts/runbook/rehearse-migrations-local.sh ile kurulan yerel yığın) denendikten sonra çalıştırılır.
-- Tek işlem içinde çalışır: herhangi bir ön koşul tutmazsa hiçbir şey değişmez.
--
-- Ön koşul: Hollanda/Almanya konumlarına bağlı profil veya örnek profil bulunmamalıdır. Varsa geri alma
-- durur; önce bu kayıtlar yönetim panelinden Türkiye konumuna taşınmalı ya da arşivlenmelidir
-- (profiles.city_id ve example_profiles.city_id kademeli silinmez; kayıt kaybı olmaz).

begin;

do $$
declare n int;
begin
  select count(*) into n from public.profiles p join public.cities c on c.id = p.city_id where c.plate >= 1000;
  if n > 0 then raise exception 'Geri alma durdu: NL/DE konumunda % profil var', n; end if;
  select count(*) into n from public.example_profiles e join public.cities c on c.id = e.city_id where c.plate >= 1000;
  if n > 0 then raise exception 'Geri alma durdu: NL/DE konumunda % örnek profil var', n; end if;
end $$;

-- NL/DE belediye ve Kreis satırları (districts → cities ilişkisi on delete cascade), ardından bölgeler.
delete from public.districts d using public.cities c where c.id = d.city_id and c.plate >= 1000;
delete from public.cities where plate >= 1000;

-- Üretilen ülke sütunu ve dizini, aralık kısıtı; eski Türkiye kısıtı geri gelir.
drop index if exists public.cities_country_idx;
alter table public.cities drop column if exists country_code;
alter table public.cities drop constraint if exists cities_plate_range;
alter table public.cities add constraint cities_plate_check check (plate between 1 and 81);

drop table if exists public.countries;

-- Yönetim panelinde NL/DE sayfaları için yazılmış SEO kayıtları (anahtar /konum/nl|de/…) silinmez;
-- yalnızca bilgi amaçlı sayılır. Uygulama bu anahtarları artık okumaz.
do $$
declare n int;
begin
  select count(*) into n from public.seo_pages where path like '/konum/%';
  raise notice 'Kullanılmayan NL/DE SEO kaydı: %', n;
end $$;

-- Doğrulama: yalnızca Türkiye verisi kalmalı.
do $$
begin
  if (select count(*) from public.cities) <> 81 then raise exception 'Geri alma doğrulaması: il sayısı 81 değil'; end if;
  if (select count(*) from public.districts) <> 973 then raise exception 'Geri alma doğrulaması: ilçe sayısı 973 değil'; end if;
end $$;

commit;
