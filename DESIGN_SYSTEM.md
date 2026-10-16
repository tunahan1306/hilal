# Tasarım sistemi

Premium gece editoryali; fotoğraf öncelikli kartlar, Fraunces başlıklar, Geist arayüz metni. Varsayılan koyu tema; açık ve sistem seçenekleri korunur.

## OKLCH tokenlar

`src/app/globals.css` renkleri OKLCH üzerinden tanımlar. Ana palet: gece eriği `#190D1B`, bordo `#512039`, ahududu `#9E315F`, gül `#E66A9B`, şampanya `#D9A76B`, fildişi `#FFF1F5`. Açık temada metin vurgusu koyu ahududu, koyu temada gül; altın açık temada okunabilirlik için koyulaştırılır. Nötr yüzeyler aynı ton ailesindedir.

## Bileşenler

- Profil kartı: 4:5 optimize fotoğraf; ad, yaş, il/ilçe, gerçek kimlik doğrulama rozeti ve sponsor etiketi. Hobi, biyografi ve tekrarlanan metadata kartta yer almaz.
- Izgara: mobil 2, tablet 3, masaüstü 4 sütun; yükleme iskeletleri aynı oranları korur.
- Listeleme: sunucuda ilk 12 sonuç, sonraki sonuçlarda cursor ve “Daha fazla göster”; hata halinde tekrar deneme.
- Yaş kapısı: sunucuda içerik öncesi tam ekran; klavye odağı, diyalog etiketi, iki açık karar. Self-declaration belgesel doğrulama yerine geçmez.
- Kontroller: 6px köşe, görünür odak halkası, 44–48px ana dokunma alanları. Reduced motion CSS kuralı korunur.
- Galeri: mobil medya şeridi, masaüstü kapak ve mozaik, tam ekran medya görünümü. Şikâyet ve rıza kaldırma bağlantıları korunur.
