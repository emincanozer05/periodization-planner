# CLAUDE.md

## İş akışı: PR ve merge

- Bir değişiklik bittiğinde onay beklemeden PR aç ve CI (GitHub kontrolleri) yeşil olunca **kendin merge et**. Kullanıcıdan ayrıca "merge et" demesini bekleme.
- Merge'den önce yerelde çalıştır:
  - `node check-syntax.js`
  - `node validator-test.js`
- Bir kontrol kırmızıysa merge etme: sebebini bul, düzelt, tekrar push'la. Düzeltemiyorsan kullanıcıya neyin bloke ettiğini söyle.
- Merge'den sonra PR takibini kapat ve kısaca ne değiştiğini bildir.
- Yanıtlar Türkçe.

## Kaynak yapısı

- `index.html` **üretilmiş** bir dosya: kaynak `src/` altında (bkz. `src/README.md`). Değişikliği `src/` altındaki ilgili parçada yap, sonra `node assemble.js` çalıştırıp `index.html`'i birlikte commit'le. `index.html`'i elle düzenleme; CI (`node assemble.js --check`) yakalar.

